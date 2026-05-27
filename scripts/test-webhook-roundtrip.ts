// End-to-end verificatie van de Resend webhook na URL-update.
//
// Flow:
//   1. Stuur een test-mail via onze normale email-service (sendEmail)
//   2. Log de resend_id
//   3. Wacht 60 seconden (Resend levert + webhookt)
//   4. Check email_logs voor delivery-update
//
// Draaien:
//   cd web && bun --conditions=react-server scripts/test-webhook-roundtrip.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { emailLogs } from "../src/lib/db/schema";
import { sendEmail } from "../src/lib/services/email";

const TO = "info@dicteren.ai";
const SUBJECT = `Webhook-roundtrip-test ${new Date().toISOString().slice(11, 19)}`;

console.log("\n=== Resend webhook end-to-end test ===\n");
console.log("→ Sending test-mail naar", TO);
console.log("  Subject:", SUBJECT);

const sendResult = await sendEmail({
  to: TO,
  subject: SUBJECT,
  html: `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;">
    <h1>Webhook-roundtrip test</h1>
    <p>Test om te verifiëren dat de Resend webhook updates aankomen.</p>
    <p>Verstuurd op: ${new Date().toISOString()}</p>
  </body></html>`,
  text: `Webhook-roundtrip test verstuurd op ${new Date().toISOString()}`,
  tags: [{ name: "category", value: "other" }],
  log: { category: "other" },
});

if (!sendResult.success) {
  console.error("✗ Send mislukt:", sendResult.error, sendResult.code);
  process.exit(1);
}

const resendId = sendResult.data.id;
console.log(`✓ Verstuurd. Resend-id: ${resendId}`);

// Polling-loop: check elke 5 seconden of de delivery-event is aangekomen.
const POLL_INTERVAL_MS = 5_000;
const MAX_WAIT_MS = 90_000;
const startedAt = Date.now();
let lastStatus = "sent";
let lastEvent: Date | null = null;
let deliveredAt: Date | null = null;

console.log(`\n→ Polling email_logs voor update (max ${MAX_WAIT_MS / 1000}s)...`);

while (Date.now() - startedAt < MAX_WAIT_MS) {
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  const [row] = await db
    .select({
      status: emailLogs.status,
      deliveredAt: emailLogs.deliveredAt,
      lastEventAt: emailLogs.lastEventAt,
      errorMessage: emailLogs.errorMessage,
    })
    .from(emailLogs)
    .where(eq(emailLogs.resendId, resendId))
    .limit(1);

  if (!row) {
    console.log(`  (geen email_logs row gevonden voor ${resendId})`);
    continue;
  }

  if (
    row.status !== lastStatus ||
    row.lastEventAt?.getTime() !== lastEvent?.getTime() ||
    row.deliveredAt?.getTime() !== deliveredAt?.getTime()
  ) {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    console.log(
      `  [+${elapsed}s] status=${row.status} delivered=${row.deliveredAt?.toISOString() ?? "—"} lastEvent=${row.lastEventAt?.toISOString() ?? "—"}${row.errorMessage ? " err=" + row.errorMessage : ""}`,
    );
    lastStatus = row.status;
    lastEvent = row.lastEventAt;
    deliveredAt = row.deliveredAt;
  }

  if (
    row.status === "delivered" ||
    row.status === "opened" ||
    row.status === "clicked" ||
    row.status === "bounced" ||
    row.status === "complained" ||
    row.status === "failed"
  ) {
    console.log(`\n✓ Webhook werkt — terminal status bereikt: ${row.status}`);
    process.exit(0);
  }
}

console.log(`\n✗ Timeout: na ${MAX_WAIT_MS / 1000}s nog geen webhook-update binnen.`);
console.log(`  Eindstatus: ${lastStatus}, lastEventAt: ${lastEvent}`);
process.exit(1);
