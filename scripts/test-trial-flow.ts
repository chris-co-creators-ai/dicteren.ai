/**
 * Test user-bound trial flow at the service layer.
 *
 *  1. claim_fresh         — user without trial → success, isExisting=false, license created
 *  2. claim_reclaim       — same user calls again → isExisting=true, same license
 *  3. claim_expired       — backdated trial → trial_already_used
 *  4. claim_revoked       — revoked trial → trial_revoked
 *  5. device_anti_abuse   — second trial activated on device with prior trial → blocked at activate
 *  6. activate_happy      — fresh device + fresh trial → token
 *
 * Run:  bun --conditions=react-server run scripts/test-trial-flow.ts
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, like, sql } from "drizzle-orm";

config({ path: ".env.local" });

const schema = await import("../src/lib/db/schema");
const { authUsers, licenses, licenseActivations, devices } = schema;

const dbSql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: dbSql, schema });

const { claimTrialForUser } = await import("../src/lib/services/trial");
const { POST: activatePOST } = await import(
  "../src/app/api/license/activate/route"
);

async function getTestUser(): Promise<{ id: string; email: string; name: string }> {
  const [u] = await db.select().from(authUsers).limit(1);
  if (!u) throw new Error("no users in neon_auth.user — sign up via web first");
  return { id: u.id, email: u.email, name: u.name };
}

async function cleanupTrialsForUser(userId: string) {
  const trials = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(sql`${licenses.userId} = ${userId} AND ${licenses.code} LIKE 'DIC-TRIAL-%'`);
  for (const t of trials) {
    await db.delete(licenseActivations).where(eq(licenseActivations.licenseId, t.id));
    await db.delete(licenses).where(eq(licenses.id, t.id));
  }
}

async function cleanupDevice(fingerprint: string) {
  await db.delete(devices).where(eq(devices.fingerprint, fingerprint));
}

// ────────────────────────────────────────────────────────────

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ────────────────────────────────────────────────────────────

async function scenarioClaimFresh() {
  const user = await getTestUser();
  await cleanupTrialsForUser(user.id);
  try {
    const r = await claimTrialForUser({ userId: user.id });
    check(
      "claim_fresh",
      r.success === true &&
        !(r as { isExisting?: boolean }).isExisting === true &&
        (r as { license: { code: string } }).license.code.startsWith("DIC-TRIAL-"),
      `success=${r.success}, code=${(r as { license?: { code: string } }).license?.code}`,
    );
  } finally {
    await cleanupTrialsForUser(user.id);
  }
}

async function scenarioClaimReclaim() {
  const user = await getTestUser();
  await cleanupTrialsForUser(user.id);
  try {
    const first = await claimTrialForUser({ userId: user.id });
    const second = await claimTrialForUser({ userId: user.id });
    if (!first.success || !second.success) {
      check("claim_reclaim", false, "expected both calls to succeed");
      return;
    }
    check(
      "claim_reclaim",
      second.isExisting === true && first.license.id === second.license.id,
      `isExisting=${second.isExisting}, sameLicense=${first.license.id === second.license.id}`,
    );
  } finally {
    await cleanupTrialsForUser(user.id);
  }
}

async function scenarioClaimExpired() {
  const user = await getTestUser();
  await cleanupTrialsForUser(user.id);
  try {
    const first = await claimTrialForUser({ userId: user.id });
    if (!first.success) {
      check("claim_expired", false, "first claim failed");
      return;
    }
    // Backdate to expired
    await db
      .update(licenses)
      .set({
        status: "expired",
        expiresAt: new Date(Date.now() - 86_400_000),
      })
      .where(eq(licenses.id, first.license.id));
    const second = await claimTrialForUser({ userId: user.id });
    check(
      "claim_expired",
      second.success === false && (second as { code?: string }).code === "trial_already_used",
      `success=${second.success}, code=${(second as { code?: string }).code}`,
    );
  } finally {
    await cleanupTrialsForUser(user.id);
  }
}

async function scenarioClaimRevoked() {
  const user = await getTestUser();
  await cleanupTrialsForUser(user.id);
  try {
    const first = await claimTrialForUser({ userId: user.id });
    if (!first.success) {
      check("claim_revoked", false, "first claim failed");
      return;
    }
    await db
      .update(licenses)
      .set({ status: "revoked" })
      .where(eq(licenses.id, first.license.id));
    const second = await claimTrialForUser({ userId: user.id });
    check(
      "claim_revoked",
      second.success === false && (second as { code?: string }).code === "trial_revoked",
      `success=${second.success}, code=${(second as { code?: string }).code}`,
    );
  } finally {
    await cleanupTrialsForUser(user.id);
  }
}

async function scenarioActivateHappy() {
  const user = await getTestUser();
  await cleanupTrialsForUser(user.id);
  const fp = `fp_trial_act_${Date.now()}`;
  try {
    const claimed = await claimTrialForUser({ userId: user.id });
    if (!claimed.success) {
      check("activate_happy", false, "claim failed");
      return;
    }
    const req = new Request("http://localhost/api/license/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenseCode: claimed.license.code,
        deviceFingerprint: fp,
        platform: "darwin-arm64",
        appVersion: "0.8.3",
      }),
    });
    const res = await activatePOST(req);
    const body = (await res.json()) as Record<string, unknown>;
    check(
      "activate_happy",
      res.status === 200 && body.success === true && typeof body.token === "string",
      `status=${res.status}`,
    );
  } finally {
    await cleanupTrialsForUser(user.id);
    await cleanupDevice(fp);
  }
}

async function scenarioDeviceAntiAbuse() {
  const user = await getTestUser();
  await cleanupTrialsForUser(user.id);
  const fp = `fp_trial_abuse_${Date.now()}`;
  try {
    // 1. User claims trial #1, activates on device fp
    const first = await claimTrialForUser({ userId: user.id });
    if (!first.success) {
      check("device_anti_abuse", false, "first claim failed");
      return;
    }
    let res = await activatePOST(
      new Request("http://localhost/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseCode: first.license.code,
          deviceFingerprint: fp,
        }),
      }),
    );
    if (res.status !== 200) {
      check("device_anti_abuse", false, `first activate failed: ${res.status}`);
      return;
    }

    // 2. Pretend a different user creates a new trial (we hand-insert it to
    //    avoid needing a 2nd user account in DB).
    const code = `DIC-TRIAL-${new Date().getFullYear()}-XXXX-YYYY`;
    const { createHash } = await import("node:crypto");
    const codeHash = createHash("sha256")
      .update(code.toUpperCase().replace(/[\s-]/g, ""))
      .digest("hex");
    const [otherTrial] = await db
      .insert(licenses)
      .values({
        code,
        codeHash,
        type: "beta",
        status: "active",
        seats: 1,
        maxActivationsPerSeat: 1,
        expiresAt: new Date(Date.now() + 14 * 86_400_000),
      })
      .returning();

    // 3. Try to activate the OTHER trial on the SAME device fingerprint
    res = await activatePOST(
      new Request("http://localhost/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseCode: code,
          deviceFingerprint: fp,
        }),
      }),
    );
    const body = (await res.json()) as Record<string, unknown>;
    check(
      "device_anti_abuse",
      res.status === 403 && String(body.error).includes("proefperiode"),
      `status=${res.status}, error=${String(body.error).slice(0, 50)}`,
    );

    // Cleanup the second trial
    await db.delete(licenses).where(eq(licenses.id, otherTrial.id));
  } finally {
    await cleanupTrialsForUser(user.id);
    await cleanupDevice(fp);
  }
}

// ────────────────────────────────────────────────────────────

console.log("─── trial flow scenarios (user-bound) ───");
await scenarioClaimFresh();
await scenarioClaimReclaim();
await scenarioClaimExpired();
await scenarioClaimRevoked();
await scenarioActivateHappy();
await scenarioDeviceAntiAbuse();

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${pass}/${results.length} groen${fail > 0 ? `, ${fail} rood` : ""}`);
process.exit(fail > 0 ? 1 : 0);
