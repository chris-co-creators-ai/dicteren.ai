/**
 * Trigger sendLicenseEmail end-to-end + verify the email_logs row was written.
 * Cleans up after itself.
 *
 * Run:  bun --conditions=react-server run scripts/test-email-log.ts
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { desc, eq } from "drizzle-orm";

config({ path: ".env.local" });

const schema = await import("../src/lib/db/schema");
const { emailLogs } = schema;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

const { sendLicenseEmail } = await import("../src/lib/services/email");

const testCode = `DIC-PRO-${new Date().getFullYear()}-TEST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const result = await sendLicenseEmail({
  to: "delivered@resend.dev",
  name: "Test Klant",
  licenseCode: testCode,
  expiresAt: new Date(Date.now() + 365 * 86_400_000),
  orderId: undefined,
});

console.log("Send result:", result);

if (!result.success) {
  console.error("send failed");
  process.exit(1);
}

// Allow Neon to commit
await new Promise((r) => setTimeout(r, 200));

const [latest] = await db
  .select()
  .from(emailLogs)
  .orderBy(desc(emailLogs.sentAt))
  .limit(1);

console.log("\nLatest log row:");
console.log({
  id: latest?.id,
  resendId: latest?.resendId,
  to: latest?.toAddress,
  category: latest?.category,
  status: latest?.status,
  subject: latest?.subject,
  sentAt: latest?.sentAt?.toISOString(),
});

const ok =
  latest?.resendId === result.data.id &&
  latest?.category === "license_issued" &&
  latest?.status === "sent" &&
  latest?.toAddress === "delivered@resend.dev";

console.log(ok ? "\n✓ log row matches send result" : "\n✗ MISMATCH");

// Cleanup
if (latest) {
  await db.delete(emailLogs).where(eq(emailLogs.id, latest.id));
  console.log("(cleaned up test row)");
}

process.exit(ok ? 0 : 1);
