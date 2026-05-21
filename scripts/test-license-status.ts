/**
 * Test /api/license/status scenarios.
 *
 *  1. happy_path           — vers token van activate → 200 + nieuwe token + status active
 *  2. no_counter_bump      — 5× status-call → activationCount blijft 1
 *  3. lazy_expiry          — verlopen license → 200 met status=expired, DB-row geupdate
 *  4. refunded_propagation — license naar refunded gezet → status-call returnt refunded
 *  5. activation_revoked   — activation.isActive=false → 401 ACTIVATION_REVOKED
 *  6. unknown_device       — token met onbekende fingerprint → 401 DEVICE_NOT_FOUND
 *  7. invalid_token        — random bytes → 401 INVALID_TOKEN
 *  8. no_token             — geen Authorization header → 401 NO_TOKEN
 *
 * Run:  bun --conditions=react-server run scripts/test-license-status.ts
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

const activateRoute = await import("../src/app/api/license/activate/route");
const statusRoute = await import("../src/app/api/license/status/route");

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function genCode(): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `DIC-PRO-${new Date().getFullYear()}-${seg()}-${seg()}`;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().replace(/[\s-]/g, "")).digest("hex");
}

async function insertActiveLicense(args: { expiresAt?: Date } = {}) {
  const code = genCode();
  const [row] = await db
    .insert(licenses)
    .values({
      code,
      codeHash: hashCode(code),
      type: "consumer",
      status: "active",
      seats: 1,
      maxActivationsPerSeat: 2,
      expiresAt: args.expiresAt ?? new Date(Date.now() + 30 * 86_400_000),
    })
    .returning();
  return { license: row, code };
}

async function activate(code: string, fingerprint: string) {
  const req = new Request("http://localhost/api/license/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      licenseCode: code,
      deviceFingerprint: fingerprint,
      platform: "darwin-arm64",
      appVersion: "0.8.3",
    }),
  });
  const res = await activateRoute.POST(req);
  const body = (await res.json()) as { token?: string; success?: boolean };
  return { status: res.status, token: body.token, body };
}

async function callStatus(token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const req = new Request("http://localhost/api/license/status", {
    method: "GET",
    headers,
  });
  const res = await statusRoute.GET(req);
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

async function cleanup(licenseId: string, ...fingerprints: string[]) {
  await db.delete(licenseActivations).where(eq(licenseActivations.licenseId, licenseId));
  await db.delete(licenses).where(eq(licenses.id, licenseId));
  for (const f of fingerprints) {
    await db.delete(devices).where(eq(devices.fingerprint, f));
  }
}

// ────────────────────────────────────────────────────────────

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ────────────────────────────────────────────────────────────
// Scenarios
// ────────────────────────────────────────────────────────────

async function scenarioHappyPath() {
  const { license, code } = await insertActiveLicense();
  const fp = `fp_status_happy_${Date.now()}`;
  try {
    const act = await activate(code, fp);
    const s = await callStatus(act.token!);
    const lic = s.body.license as { status: string };
    check(
      "happy_path",
      s.status === 200 && lic.status === "active" && typeof s.body.token === "string",
      `status=${s.status}, lic=${lic.status}`,
    );
  } finally {
    await cleanup(license.id, fp);
  }
}

async function scenarioNoCounterBump() {
  const { license, code } = await insertActiveLicense();
  const fp = `fp_status_counter_${Date.now()}`;
  try {
    const act = await activate(code, fp);
    let lastToken = act.token!;
    for (let i = 0; i < 5; i++) {
      const s = await callStatus(lastToken);
      if (typeof (s.body as { token?: string }).token === "string") {
        lastToken = (s.body as { token: string }).token;
      }
    }
    const [after] = await db.select().from(licenses).where(eq(licenses.id, license.id));
    check(
      "no_counter_bump",
      after.activationCount === 1,
      `activationCount=${after.activationCount}`,
    );
  } finally {
    await cleanup(license.id, fp);
  }
}

async function scenarioLazyExpiry() {
  const { license, code } = await insertActiveLicense({
    expiresAt: new Date(Date.now() + 60_000),
  });
  const fp = `fp_status_lazy_${Date.now()}`;
  try {
    const act = await activate(code, fp);
    // Backdate after activation so the activate-route doesn't block it.
    await db
      .update(licenses)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(licenses.id, license.id));
    const s = await callStatus(act.token!);
    const [after] = await db.select().from(licenses).where(eq(licenses.id, license.id));
    const lic = s.body.license as { status: string };
    check(
      "lazy_expiry",
      s.status === 200 && lic.status === "expired" && after.status === "expired",
      `status=${s.status}, lic=${lic.status}, db=${after.status}`,
    );
  } finally {
    await cleanup(license.id, fp);
  }
}

async function scenarioRefundedPropagation() {
  const { license, code } = await insertActiveLicense();
  const fp = `fp_status_refund_${Date.now()}`;
  try {
    const act = await activate(code, fp);
    // Simulate refund webhook flipping the license status.
    await db
      .update(licenses)
      .set({ status: "refunded" })
      .where(eq(licenses.id, license.id));
    const s = await callStatus(act.token!);
    const lic = s.body.license as { status: string };
    check(
      "refunded_propagation",
      s.status === 200 && lic.status === "refunded",
      `status=${s.status}, lic=${lic.status}`,
    );
  } finally {
    await cleanup(license.id, fp);
  }
}

async function scenarioActivationRevoked() {
  const { license, code } = await insertActiveLicense();
  const fp = `fp_status_revoked_${Date.now()}`;
  try {
    const act = await activate(code, fp);
    await db
      .update(licenseActivations)
      .set({ isActive: false, deactivatedAt: new Date() })
      .where(eq(licenseActivations.licenseId, license.id));
    const s = await callStatus(act.token!);
    check(
      "activation_revoked",
      s.status === 401 && s.body.code === "ACTIVATION_REVOKED",
      `status=${s.status}, code=${s.body.code}`,
    );
  } finally {
    await cleanup(license.id, fp);
  }
}

async function scenarioUnknownDevice() {
  // Activate, capture token, then delete the device row → token says
  // fingerprint X but devices-table no longer has X.
  const { license, code } = await insertActiveLicense();
  const fp = `fp_status_dev_${Date.now()}`;
  try {
    const act = await activate(code, fp);
    await db.delete(licenseActivations).where(eq(licenseActivations.licenseId, license.id));
    await db.delete(devices).where(eq(devices.fingerprint, fp));
    const s = await callStatus(act.token!);
    check(
      "unknown_device",
      s.status === 401 && s.body.code === "DEVICE_NOT_FOUND",
      `status=${s.status}, code=${s.body.code}`,
    );
  } finally {
    await cleanup(license.id, fp);
  }
}

async function scenarioInvalidToken() {
  const s = await callStatus("not-a-real-token");
  check(
    "invalid_token",
    s.status === 401 && typeof s.body.code === "string",
    `status=${s.status}, code=${s.body.code}`,
  );
}

async function scenarioNoToken() {
  const s = await callStatus(null);
  check(
    "no_token",
    s.status === 401 && s.body.code === "NO_TOKEN",
    `status=${s.status}, code=${s.body.code}`,
  );
}

// ────────────────────────────────────────────────────────────

console.log("─── /api/license/status scenarios ───");
await scenarioHappyPath();
await scenarioNoCounterBump();
await scenarioLazyExpiry();
await scenarioRefundedPropagation();
await scenarioActivationRevoked();
await scenarioUnknownDevice();
await scenarioInvalidToken();
await scenarioNoToken();

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${pass}/${results.length} groen${fail > 0 ? `, ${fail} rood` : ""}`);
process.exit(fail > 0 ? 1 : 0);
