import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

// `ALTER TYPE ... ADD VALUE` must run outside a transaction. neon-http runs
// each query in its own implicit txn so we just send them one at a time.
const STEPS: { label: string; sql: string }[] = [
  { label: "add trial_started",       sql: `ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'trial_started'` },
  { label: "add trial_reminder_d7",   sql: `ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'trial_reminder_d7'` },
  { label: "add trial_reminder_d13",  sql: `ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'trial_reminder_d13'` },
  { label: "add trial_expired",       sql: `ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'trial_expired'` },
];

console.log(`Running ${STEPS.length} statements`);
for (const [i, step] of STEPS.entries()) {
  try {
    await sql.query(step.sql);
    console.log(`  [${i + 1}/${STEPS.length}] ✓ ${step.label}`);
  } catch (err) {
    const msg = (err as Error).message;
    if (/already exists/i.test(msg)) {
      console.log(`  [${i + 1}/${STEPS.length}] − ${step.label} (already)`);
      continue;
    }
    console.error(`  [${i + 1}/${STEPS.length}] ✗ ${step.label}`);
    console.error(`    ${msg}`);
    process.exit(1);
  }
}
console.log("\nMigration 0004 applied.");
