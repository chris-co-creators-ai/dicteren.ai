/**
 * Test alle /api/license/activate scenarios end-to-end zonder dev-server.
 *
 *  1. unknown_code      — niet bestaande code → 404
 *  2. invalid_format    — niet matching pattern → 400
 *  3. happy_path        — verse active license + nieuw device → 200 + token + counter+1
 *  4. reactivate_device — zelfde fingerprint opnieuw → 200, GEEN counter bump
 *  5. limit_reached     — 3e fingerprint op seats×max=2 → 409
 *  6. expired_license   — expiresAt in verleden → 403 + status laat naar expired
 *  7. refunded_license  — status=refunded → 403 met "niet meer geldig" boodschap
 *  8. revoked_license   — status=revoked → 403
 *
 * Run:  bun run scripts/test-license-activate.ts
 *
 * Strategy: roep POST(request) direct aan vanuit het route-bestand. Schema
 * imports we direct (omzeilt server-only zoals in test-mollie-flow.ts).
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

config({ path: ".env.local" });

const schema = await import("../src/lib/db/schema");
const { licenses, licenseActivations, devices } = schema;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

// Direct import of the route — no Next dev server needed.
const { POST } = await import("../src/app/api/license/activate/route");

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function genCode(prefix: "PRO" | "TEAM" | "BETA"): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `DIC-${prefix}-${new Date().getFullYear()}-${seg()}-${seg()}`;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().replace(/[\s-]/g, "")).digest("hex");
}

async function insertLicense(args: {
  code: string;
  status: "active" | "trial" | "expired" | "refunded" | "revoked" | "canceled" | "past_due";
  expiresAt?: Date | null;
  seats?: number;
  maxActivationsPerSeat?: number;
}) {
  const [row] = await db
    .insert(licenses)
    .values({
      code: args.code,
      codeHash: hashCode(args.code),
      type: "consumer",
      status: args.status,
      seats: args.seats ?? 1,
      maxActivationsPerSeat: args.maxActivationsPerSeat ?? 2,
      expiresAt: args.expiresAt ?? new Date(Date.now() + 30 * 86_400_000),
    })
    .returning();
  return row;
}

async function cleanupLicense(licenseId: string) {
  await db.delete(licenseActivations).where(eq(licenseActivations.licenseId, licenseId));
  await db.delete(licenses).where(eq(licenses.id, licenseId));
}

async function cleanupDevice(fingerprint: string) {
  await db.delete(devices).where(eq(devices.fingerprint, fingerprint));
}

async function callActivate(body: object) {
  const req = new Request("http://localhost/api/license/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body: json };
}

// ────────────────────────────────────────────────────────────
// Scenarios
// ────────────────────────────────────────────────────────────

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function scenarioUnknownCode() {
  const code = genCode("PRO");
  const r = await callActivate({
    licenseCode: code,
    deviceFingerprint: "fp_unknown",
    platform: "darwin-arm64",
    appVersion: "0.8.3",
  });
  check(
    "unknown_code",
    r.status === 404 && r.body.success === false,
    `status=${r.status}`,
  );
  await cleanupDevice("fp_unknown");
}

async function scenarioInvalidFormat() {
  const r = await callActivate({
    licenseCode: "not-a-real-code",
    deviceFingerprint: "fp_invalid_fmt",
  });
  check(
    "invalid_format",
    r.status === 400 && r.body.success === false,
    `status=${r.status}`,
  );
}

async function scenarioHappyPath() {
  const code = genCode("PRO");
  const lic = await insertLicense({ code, status: "active" });
  const fp = `fp_happy_${Date.now()}`;
  try {
    const r = await callActivate({
      licenseCode: code,
      deviceFingerprint: fp,
      platform: "darwin-arm64",
      appVersion: "0.8.3",
    });
    const [after] = await db.select().from(licenses).where(eq(licenses.id, lic.id));
    check(
      "happy_path",
      r.status === 200 &&
        r.body.success === true &&
        typeof r.body.token === "string" &&
        after.activationCount === 1,
      `status=${r.status}, activationCount=${after.activationCount}`,
    );
  } finally {
    await cleanupLicense(lic.id);
    await cleanupDevice(fp);
  }
}

async function scenarioReactivateDevice() {
  const code = genCode("PRO");
  const lic = await insertLicense({ code, status: "active" });
  const fp = `fp_reactivate_${Date.now()}`;
  try {
    const r1 = await callActivate({
      licenseCode: code,
      deviceFingerprint: fp,
      platform: "darwin-arm64",
      appVersion: "0.8.3",
    });
    const r2 = await callActivate({
      licenseCode: code,
      deviceFingerprint: fp,
      platform: "darwin-arm64",
      appVersion: "0.8.4",
    });
    const [after] = await db.select().from(licenses).where(eq(licenses.id, lic.id));
    const actCount = await db
      .select()
      .from(licenseActivations)
      .where(eq(licenseActivations.licenseId, lic.id));
    check(
      "reactivate_device",
      r1.status === 200 &&
        r2.status === 200 &&
        after.activationCount === 1 &&
        actCount.length === 1,
      `counter=${after.activationCount}, activations=${actCount.length}`,
    );
  } finally {
    await cleanupLicense(lic.id);
    await cleanupDevice(fp);
  }
}

async function scenarioLimitReached() {
  const code = genCode("PRO");
  const lic = await insertLicense({
    code,
    status: "active",
    seats: 1,
    maxActivationsPerSeat: 2,
  });
  const fps = [
    `fp_limit_a_${Date.now()}`,
    `fp_limit_b_${Date.now()}`,
    `fp_limit_c_${Date.now()}`,
  ];
  try {
    const r1 = await callActivate({ licenseCode: code, deviceFingerprint: fps[0] });
    const r2 = await callActivate({ licenseCode: code, deviceFingerprint: fps[1] });
    const r3 = await callActivate({ licenseCode: code, deviceFingerprint: fps[2] });
    check(
      "limit_reached",
      r1.status === 200 && r2.status === 200 && r3.status === 409,
      `r1=${r1.status} r2=${r2.status} r3=${r3.status}`,
    );
  } finally {
    await cleanupLicense(lic.id);
    for (const f of fps) await cleanupDevice(f);
  }
}

async function scenarioExpiredLicense() {
  const code = genCode("PRO");
  const lic = await insertLicense({
    code,
    status: "active",
    expiresAt: new Date(Date.now() - 86_400_000),
  });
  const fp = `fp_expired_${Date.now()}`;
  try {
    const r = await callActivate({
      licenseCode: code,
      deviceFingerprint: fp,
    });
    const [after] = await db.select().from(licenses).where(eq(licenses.id, lic.id));
    check(
      "expired_license",
      r.status === 403 && r.body.success === false && after.status === "expired",
      `status=${r.status}, dbStatus=${after.status}`,
    );
  } finally {
    await cleanupLicense(lic.id);
    await cleanupDevice(fp);
  }
}

async function scenarioRefundedLicense() {
  const code = genCode("PRO");
  const lic = await insertLicense({ code, status: "refunded" });
  const fp = `fp_refunded_${Date.now()}`;
  try {
    const r = await callActivate({
      licenseCode: code,
      deviceFingerprint: fp,
    });
    check(
      "refunded_license",
      r.status === 403 && String(r.body.error).includes("niet meer geldig"),
      `status=${r.status}`,
    );
  } finally {
    await cleanupLicense(lic.id);
    await cleanupDevice(fp);
  }
}

async function scenarioRevokedLicense() {
  const code = genCode("PRO");
  const lic = await insertLicense({ code, status: "revoked" });
  const fp = `fp_revoked_${Date.now()}`;
  try {
    const r = await callActivate({
      licenseCode: code,
      deviceFingerprint: fp,
    });
    check("revoked_license", r.status === 403, `status=${r.status}`);
  } finally {
    await cleanupLicense(lic.id);
    await cleanupDevice(fp);
  }
}

// ────────────────────────────────────────────────────────────
// Run
// ────────────────────────────────────────────────────────────

console.log("─── /api/license/activate scenarios ───");
await scenarioUnknownCode();
await scenarioInvalidFormat();
await scenarioHappyPath();
await scenarioReactivateDevice();
await scenarioLimitReached();
await scenarioExpiredLicense();
await scenarioRefundedLicense();
await scenarioRevokedLicense();

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${pass}/${results.length} groen${fail > 0 ? `, ${fail} rood` : ""}`);
process.exit(fail > 0 ? 1 : 0);
