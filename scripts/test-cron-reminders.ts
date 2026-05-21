/**
 * Test /api/cron/trial-reminders by creating fixtures at d7, d13 and
 * expired windows, calling the route handler, then verifying the right
 * email_logs rows were inserted.
 *
 * Run:  bun --conditions=react-server run scripts/test-cron-reminders.ts
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, like } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

config({ path: ".env.local" });

// Disable auth for the test
delete process.env.CRON_SECRET;

const schema = await import("../src/lib/db/schema");
const { authUsers, emailLogs, licenses, licenseActivations } = schema;

const dbSql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: dbSql, schema });

const { GET } = await import("../src/app/api/cron/trial-reminders/route");

async function getTestUser() {
  const [u] = await db.select().from(authUsers).limit(1);
  if (!u) throw new Error("no user");
  return u;
}

function hashCode(code: string) {
  return createHash("sha256")
    .update(code.toUpperCase().replace(/[\s-]/g, ""))
    .digest("hex");
}

function genCode() {
  const seg = () => randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `DIC-TRIAL-${new Date().getFullYear()}-${seg()}-${seg()}`;
}

async function makeTrial(userId: string, expiresInDays: number) {
  const code = genCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000);
  const [row] = await db
    .insert(licenses)
    .values({
      code,
      codeHash: hashCode(code),
      type: "beta",
      status: "active",
      userId,
      seats: 1,
      maxActivationsPerSeat: 1,
      issuedAt: new Date(),
      expiresAt,
    })
    .returning();
  return row;
}

async function cleanupLicense(id: string) {
  await db.delete(licenseActivations).where(eq(licenseActivations.licenseId, id));
  await db.delete(emailLogs).where(eq(emailLogs.licenseId, id));
  await db.delete(licenses).where(eq(licenses.id, id));
}

async function emailLogFor(licenseId: string, category: string) {
  const [row] = await db
    .select()
    .from(emailLogs)
    .where(and(eq(emailLogs.licenseId, licenseId), eq(emailLogs.category, category as never)))
    .limit(1);
  return row ?? null;
}

async function callCron() {
  const req = new Request("http://localhost/api/cron/trial-reminders", {
    headers: {},
  });
  const res = await GET(req);
  return (await res.json()) as Record<string, unknown>;
}

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ────────────────────────────────────────────────────────────

async function scenarioD7Reminder() {
  const u = await getTestUser();
  const trial = await makeTrial(u.id, 7); // ~7 days left
  try {
    const r = await callCron();
    const mail = await emailLogFor(trial.id, "trial_reminder_d7");
    check(
      "d7_reminder_sent",
      Boolean(mail) && (mail?.status === "sent" || mail?.status === "failed"),
      `cron counts=${JSON.stringify(r.counts)}, mail=${mail?.status ?? "missing"}`,
    );
  } finally {
    await cleanupLicense(trial.id);
  }
}

async function scenarioD13Reminder() {
  const u = await getTestUser();
  // 1 day = 86_400_000; set to ~24h from now
  const trial = await makeTrial(u.id, 1);
  try {
    const r = await callCron();
    const mail = await emailLogFor(trial.id, "trial_reminder_d13");
    check(
      "d13_reminder_sent",
      Boolean(mail),
      `cron counts=${JSON.stringify(r.counts)}, mail=${mail?.status ?? "missing"}`,
    );
  } finally {
    await cleanupLicense(trial.id);
  }
}

async function scenarioExpiredFlip() {
  const u = await getTestUser();
  // Expired 2 days ago
  const trial = await makeTrial(u.id, -2);
  try {
    await callCron();
    const mail = await emailLogFor(trial.id, "trial_expired");
    const [licAfter] = await db
      .select({ status: licenses.status })
      .from(licenses)
      .where(eq(licenses.id, trial.id));
    check(
      "expired_flip_status_and_mail",
      licAfter.status === "expired" && Boolean(mail),
      `status=${licAfter.status}, mail=${mail?.status ?? "missing"}`,
    );
  } finally {
    await cleanupLicense(trial.id);
  }
}

async function scenarioIdempotent() {
  const u = await getTestUser();
  const trial = await makeTrial(u.id, 7);
  try {
    await callCron();
    await callCron();
    const mails = await db
      .select()
      .from(emailLogs)
      .where(and(eq(emailLogs.licenseId, trial.id), eq(emailLogs.category, "trial_reminder_d7" as never)));
    check(
      "d7_idempotent",
      mails.length === 1,
      `mail count after 2 cron runs = ${mails.length}`,
    );
  } finally {
    await cleanupLicense(trial.id);
  }
}

async function scenarioOutOfWindow() {
  const u = await getTestUser();
  // 10 days out — outside d7 (6-8d) and d13 (12-36h) windows
  const trial = await makeTrial(u.id, 10);
  try {
    await callCron();
    const d7 = await emailLogFor(trial.id, "trial_reminder_d7");
    const d13 = await emailLogFor(trial.id, "trial_reminder_d13");
    const expired = await emailLogFor(trial.id, "trial_expired");
    check(
      "no_mail_outside_windows",
      !d7 && !d13 && !expired,
      `d7=${d7 ? "yes" : "no"}, d13=${d13 ? "yes" : "no"}, expired=${expired ? "yes" : "no"}`,
    );
  } finally {
    await cleanupLicense(trial.id);
  }
}

// ────────────────────────────────────────────────────────────

// Pre-clean any leftover test trials from prior runs (defensive)
async function preClean() {
  const stale = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(like(licenses.code, "DIC-TRIAL-%"));
  for (const s of stale) {
    // Only delete trials whose customer_email is null AND notes look like ours;
    // safer not to nuke real user trials. Skip pre-clean by default.
    void s;
  }
}

await preClean();

console.log("─── /api/cron/trial-reminders scenarios ───");
await scenarioD7Reminder();
await scenarioD13Reminder();
await scenarioExpiredFlip();
await scenarioIdempotent();
await scenarioOutOfWindow();

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${pass}/${results.length} groen${fail > 0 ? `, ${fail} rood` : ""}`);
process.exit(fail > 0 ? 1 : 0);
