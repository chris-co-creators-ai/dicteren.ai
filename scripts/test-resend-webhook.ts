/**
 * Smoke-test /api/resend/webhook by directly calling POST() with fake events
 * (skipping Svix-signing — verify path runs when RESEND_WEBHOOK_SECRET unset).
 *
 *  1. unknown_email_id → skipped, status=200
 *  2. delivered for existing log row → status → delivered + deliveredAt
 *  3. bounced after delivered → bounced (terminal-negative overrides positive)
 *  4. delivered after bounced → stays bounced (don't overwrite)
 *
 * Run:  bun --conditions=react-server run scripts/test-resend-webhook.ts
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });

// Wipe webhook-secret so the test path skips Svix verify.
delete process.env.RESEND_WEBHOOK_SECRET;

const schema = await import("../src/lib/db/schema");
const { emailLogs } = schema;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

const { POST } = await import("../src/app/api/resend/webhook/route");

async function callWebhook(body: object) {
  const req = new Request("http://localhost/api/resend/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const data = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body: data };
}

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ────────────────────────────────────────────────────────────

async function scenarioUnknownEmailId() {
  const r = await callWebhook({
    type: "email.delivered",
    data: { email_id: "unknown-fake-id-12345" },
  });
  check(
    "unknown_email_id",
    r.status === 200 && r.body.skipped === "unknown email_id",
    `status=${r.status}, skipped=${r.body.skipped}`,
  );
}

async function scenarioDeliveredUpgrade() {
  const fakeResendId = `test_${Date.now()}_a`;
  const [row] = await db
    .insert(emailLogs)
    .values({
      resendId: fakeResendId,
      toAddress: "test@example.com",
      fromAddress: "licenties@send.dicteren.ai",
      subject: "Test",
      category: "license_issued",
      status: "sent",
    })
    .returning();
  try {
    const r = await callWebhook({
      type: "email.delivered",
      data: { email_id: fakeResendId },
    });
    const [after] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, row.id));
    check(
      "delivered_upgrade",
      r.status === 200 &&
        after.status === "delivered" &&
        after.deliveredAt !== null,
      `status=${after.status}, deliveredAt=${after.deliveredAt ? "set" : "null"}`,
    );
  } finally {
    await db.delete(emailLogs).where(eq(emailLogs.id, row.id));
  }
}

async function scenarioBounceWins() {
  const fakeResendId = `test_${Date.now()}_b`;
  const [row] = await db
    .insert(emailLogs)
    .values({
      resendId: fakeResendId,
      toAddress: "test@example.com",
      fromAddress: "licenties@send.dicteren.ai",
      subject: "Test",
      category: "license_issued",
      status: "delivered",
    })
    .returning();
  try {
    // Bounce arrives after delivered (race or different recipient)
    await callWebhook({
      type: "email.bounced",
      data: {
        email_id: fakeResendId,
        bounce: { message: "Mailbox does not exist", type: "Permanent" },
      },
    });
    const [afterBounce] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, row.id));

    // Now delivered arrives later — should NOT overwrite bounce
    await callWebhook({
      type: "email.delivered",
      data: { email_id: fakeResendId },
    });
    const [afterDelivered] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, row.id));

    check(
      "bounce_terminal_negative",
      afterBounce.status === "bounced" &&
        afterDelivered.status === "bounced" &&
        afterBounce.errorMessage === "Mailbox does not exist",
      `afterBounce=${afterBounce.status}, afterDelivered=${afterDelivered.status}, err=${afterBounce.errorMessage}`,
    );
  } finally {
    await db.delete(emailLogs).where(eq(emailLogs.id, row.id));
  }
}

async function scenarioOpenedTracking() {
  const fakeResendId = `test_${Date.now()}_c`;
  const [row] = await db
    .insert(emailLogs)
    .values({
      resendId: fakeResendId,
      toAddress: "test@example.com",
      fromAddress: "licenties@send.dicteren.ai",
      subject: "Test",
      category: "license_issued",
      status: "delivered",
      deliveredAt: new Date(),
    })
    .returning();
  try {
    await callWebhook({
      type: "email.opened",
      data: { email_id: fakeResendId },
    });
    const [after] = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, row.id));
    check(
      "opened_tracks",
      after.status === "opened" && after.lastEventAt !== null,
      `status=${after.status}, lastEventAt=${after.lastEventAt ? "set" : "null"}`,
    );
  } finally {
    await db.delete(emailLogs).where(eq(emailLogs.id, row.id));
  }
}

// ────────────────────────────────────────────────────────────

console.log("─── /api/resend/webhook scenarios ───");
await scenarioUnknownEmailId();
await scenarioDeliveredUpgrade();
await scenarioBounceWins();
await scenarioOpenedTracking();

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${pass}/${results.length} groen${fail > 0 ? `, ${fail} rood` : ""}`);
process.exit(fail > 0 ? 1 : 0);
