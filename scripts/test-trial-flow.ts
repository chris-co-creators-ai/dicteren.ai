/**
 * Test /api/license/trial scenarios.
 *
 *  1. happy_first_trial    — verse fingerprint → 200, code DIC-TRIAL-*, 14d expiry
 *  2. reactivate           — zelfde fingerprint opnieuw binnen geldigheid → 200, isExisting=true
 *  3. expired_trial_locked — verlopen trial → 403 trial_already_used
 *  4. invalid_fingerprint  — geen fingerprint → 400 missing_fingerprint
 *  5. counter_no_bump      — 5× call op active trial → activationCount blijft 1
 *
 * Run:  bun --conditions=react-server run scripts/test-trial-flow.ts
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, like } from "drizzle-orm";

config({ path: ".env.local" });

const schema = await import("../src/lib/db/schema");
const { licenses, licenseActivations, devices } = schema;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

const { POST } = await import("../src/app/api/license/trial/route");

async function callTrial(body: object) {
  const req = new Request("http://localhost/api/license/trial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body: json };
}

async function cleanupTrialFor(fingerprint: string) {
  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(eq(devices.fingerprint, fingerprint))
    .limit(1);
  if (!device) return;
  const acts = await db
    .select({ id: licenseActivations.id, licenseId: licenseActivations.licenseId })
    .from(licenseActivations)
    .innerJoin(licenses, eq(licenses.id, licenseActivations.licenseId))
    .where(
      and(
        eq(licenseActivations.deviceId, device.id),
        like(licenses.code, "DIC-TRIAL-%"),
      ),
    );
  for (const a of acts) {
    await db.delete(licenseActivations).where(eq(licenseActivations.id, a.id));
    await db.delete(licenses).where(eq(licenses.id, a.licenseId));
  }
  await db.delete(devices).where(eq(devices.id, device.id));
}

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ────────────────────────────────────────────────────────────

async function scenarioHappyFirstTrial() {
  const fp = `fp_trial_happy_${Date.now()}`;
  try {
    const r = await callTrial({
      deviceFingerprint: fp,
      platform: "darwin-arm64",
      appVersion: "0.8.3",
    });
    const lic = r.body.license as { status: string; type: string; expiresAt: string };
    const expiry = new Date(lic.expiresAt);
    const daysUntilExpiry = (expiry.getTime() - Date.now()) / 86_400_000;
    check(
      "happy_first_trial",
      r.status === 200 &&
        r.body.success === true &&
        typeof r.body.token === "string" &&
        r.body.isExisting === false &&
        lic.status === "active" &&
        lic.type === "beta" &&
        daysUntilExpiry > 13 && daysUntilExpiry < 15,
      `status=${r.status}, days=${daysUntilExpiry.toFixed(1)}, isExisting=${r.body.isExisting}`,
    );
  } finally {
    await cleanupTrialFor(fp);
  }
}

async function scenarioReactivate() {
  const fp = `fp_trial_reactivate_${Date.now()}`;
  try {
    const first = await callTrial({ deviceFingerprint: fp });
    const second = await callTrial({ deviceFingerprint: fp });
    check(
      "reactivate",
      first.status === 200 &&
        second.status === 200 &&
        first.body.isExisting === false &&
        second.body.isExisting === true,
      `first.isExisting=${first.body.isExisting}, second.isExisting=${second.body.isExisting}`,
    );
  } finally {
    await cleanupTrialFor(fp);
  }
}

async function scenarioCounterNoBump() {
  const fp = `fp_trial_counter_${Date.now()}`;
  try {
    await callTrial({ deviceFingerprint: fp });
    for (let i = 0; i < 4; i++) {
      await callTrial({ deviceFingerprint: fp });
    }
    const [lic] = await db
      .select()
      .from(licenses)
      .where(like(licenses.code, "DIC-TRIAL-%"))
      .orderBy(licenses.createdAt);
    const trialForThisFp = await db
      .select({ licenseId: licenseActivations.licenseId })
      .from(licenseActivations)
      .innerJoin(devices, eq(devices.id, licenseActivations.deviceId))
      .where(eq(devices.fingerprint, fp))
      .limit(1);
    const mine = lic ? trialForThisFp.find((t) => t.licenseId === lic.id) : null;
    check(
      "counter_no_bump",
      mine !== null &&
        (
          await db
            .select()
            .from(licenses)
            .where(eq(licenses.id, mine!.licenseId))
        )[0].activationCount === 1,
      `5 calls produced activationCount=${
        (
          await db
            .select()
            .from(licenses)
            .where(eq(licenses.id, mine!.licenseId))
        )[0].activationCount
      }`,
    );
  } finally {
    await cleanupTrialFor(fp);
  }
}

async function scenarioExpiredTrialLocked() {
  const fp = `fp_trial_expired_${Date.now()}`;
  try {
    // Start trial then backdate expiresAt + status to expired.
    await callTrial({ deviceFingerprint: fp });
    const [device] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.fingerprint, fp));
    const trial = (
      await db
        .select({ id: licenses.id })
        .from(licenses)
        .innerJoin(licenseActivations, eq(licenseActivations.licenseId, licenses.id))
        .where(
          and(
            eq(licenseActivations.deviceId, device.id),
            like(licenses.code, "DIC-TRIAL-%"),
          ),
        )
    )[0];
    await db
      .update(licenses)
      .set({
        status: "expired",
        expiresAt: new Date(Date.now() - 86_400_000),
      })
      .where(eq(licenses.id, trial.id));

    const r = await callTrial({ deviceFingerprint: fp });
    check(
      "expired_trial_locked",
      r.status === 403 && r.body.code === "trial_already_used",
      `status=${r.status}, code=${r.body.code}`,
    );
  } finally {
    await cleanupTrialFor(fp);
  }
}

async function scenarioInvalidFingerprint() {
  const r = await callTrial({});
  check(
    "invalid_fingerprint",
    r.status === 400 && r.body.code === "missing_fingerprint",
    `status=${r.status}, code=${r.body.code}`,
  );
}

// ────────────────────────────────────────────────────────────

console.log("─── /api/license/trial scenarios ───");
await scenarioHappyFirstTrial();
await scenarioReactivate();
await scenarioCounterNoBump();
await scenarioExpiredTrialLocked();
await scenarioInvalidFingerprint();

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${pass}/${results.length} groen${fail > 0 ? `, ${fail} rood` : ""}`);
process.exit(fail > 0 ? 1 : 0);
