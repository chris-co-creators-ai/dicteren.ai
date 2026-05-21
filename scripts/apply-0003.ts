import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

const STEPS: { label: string; sql: string }[] = [
  {
    label: "create enum email_status",
    sql: `DO $$ BEGIN
      CREATE TYPE "email_status" AS ENUM ('sent','delivered','opened','clicked','bounced','complained','failed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  },
  {
    label: "create enum email_category",
    sql: `DO $$ BEGIN
      CREATE TYPE "email_category" AS ENUM ('license_issued','welcome','subscription_past_due','subscription_canceled','subscription_renewed','refund','other');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  },
  {
    label: "create email_logs",
    sql: `CREATE TABLE IF NOT EXISTS "email_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "resend_id" text,
      "to_address" text NOT NULL,
      "from_address" text NOT NULL,
      "subject" text NOT NULL,
      "category" "email_category" NOT NULL,
      "status" "email_status" NOT NULL DEFAULT 'sent',
      "error_message" text,
      "error_code" text,
      "idempotency_key" text,
      "user_id" uuid,
      "order_id" uuid,
      "license_id" uuid,
      "subscription_id" uuid,
      "sent_at" timestamp with time zone NOT NULL DEFAULT now(),
      "delivered_at" timestamp with time zone,
      "last_event_at" timestamp with time zone
    )`,
  },
  {
    label: "fk email_logs.user_id → neon_auth.user",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='email_logs_user_id_fk') THEN
        ALTER TABLE "email_logs"
          ADD CONSTRAINT "email_logs_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL;
      END IF;
    END $$`,
  },
  {
    label: "fk email_logs.order_id → orders",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='email_logs_order_id_fk') THEN
        ALTER TABLE "email_logs"
          ADD CONSTRAINT "email_logs_order_id_fk"
          FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
      END IF;
    END $$`,
  },
  {
    label: "fk email_logs.license_id → licenses",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='email_logs_license_id_fk') THEN
        ALTER TABLE "email_logs"
          ADD CONSTRAINT "email_logs_license_id_fk"
          FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL;
      END IF;
    END $$`,
  },
  {
    label: "fk email_logs.subscription_id → subscriptions",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='email_logs_subscription_id_fk') THEN
        ALTER TABLE "email_logs"
          ADD CONSTRAINT "email_logs_subscription_id_fk"
          FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL;
      END IF;
    END $$`,
  },
  { label: "idx email_logs_to", sql: `CREATE INDEX IF NOT EXISTS "email_logs_to_idx" ON "email_logs" ("to_address")` },
  { label: "idx email_logs_user", sql: `CREATE INDEX IF NOT EXISTS "email_logs_user_idx" ON "email_logs" ("user_id")` },
  { label: "idx email_logs_category", sql: `CREATE INDEX IF NOT EXISTS "email_logs_category_idx" ON "email_logs" ("category")` },
  { label: "idx email_logs_status", sql: `CREATE INDEX IF NOT EXISTS "email_logs_status_idx" ON "email_logs" ("status")` },
  { label: "idx email_logs_sent", sql: `CREATE INDEX IF NOT EXISTS "email_logs_sent_idx" ON "email_logs" ("sent_at")` },
  { label: "unique email_logs.resend_id", sql: `CREATE UNIQUE INDEX IF NOT EXISTS "email_logs_resend_id_unique" ON "email_logs" ("resend_id")` },
];

console.log(`Running ${STEPS.length} statements`);

for (const [i, step] of STEPS.entries()) {
  try {
    await sql.query(step.sql);
    console.log(`  [${i + 1}/${STEPS.length}] ✓ ${step.label}`);
  } catch (err) {
    const msg = (err as Error).message;
    if (/already exists|does not exist/i.test(msg)) {
      console.log(`  [${i + 1}/${STEPS.length}] − ${step.label} (skipped)`);
      continue;
    }
    console.error(`  [${i + 1}/${STEPS.length}] ✗ ${step.label}`);
    console.error(`    ${msg}`);
    process.exit(1);
  }
}

console.log("\nMigration 0003 applied.");
