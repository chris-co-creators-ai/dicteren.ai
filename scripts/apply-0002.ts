import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

const STEPS: { label: string; sql: string }[] = [
  // 1. subscription_status enum
  {
    label: "enum subscription_status",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='subscription_status') THEN
        CREATE TYPE "subscription_status" AS ENUM ('active','canceled','completed','suspended','past_due');
      END IF;
    END $$`,
  },

  // 2. user_billing
  {
    label: "create user_billing",
    sql: `CREATE TABLE IF NOT EXISTS "user_billing" (
      "user_id" uuid PRIMARY KEY,
      "mollie_customer_id" text,
      "billing_email" text,
      "country_code" text,
      "address_line_1" text,
      "address_line_2" text,
      "postal_code" text,
      "city" text,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )`,
  },
  {
    label: "fk user_billing.user_id → neon_auth.user",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='user_billing_user_id_fk') THEN
        ALTER TABLE "user_billing"
          ADD CONSTRAINT "user_billing_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
      END IF;
    END $$`,
  },

  // 3. subscriptions
  {
    label: "create subscriptions",
    sql: `CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "mollie_subscription_id" text NOT NULL,
      "mollie_customer_id" text NOT NULL,
      "user_id" uuid,
      "organization_id" uuid,
      "license_id" uuid,
      "plan_id" uuid,
      "status" "subscription_status" NOT NULL DEFAULT 'active',
      "interval_label" text NOT NULL,
      "amount_cents" integer NOT NULL,
      "currency" text NOT NULL DEFAULT 'EUR',
      "seats" integer NOT NULL DEFAULT 1,
      "next_billing_at" timestamp with time zone,
      "canceled_at" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )`,
  },
  {
    label: "fk subscriptions.user_id → neon_auth.user",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='subscriptions_user_id_fk') THEN
        ALTER TABLE "subscriptions"
          ADD CONSTRAINT "subscriptions_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL;
      END IF;
    END $$`,
  },
  {
    label: "fk subscriptions.organization_id → neon_auth.organization",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='subscriptions_organization_id_fk') THEN
        ALTER TABLE "subscriptions"
          ADD CONSTRAINT "subscriptions_organization_id_fk"
          FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE SET NULL;
      END IF;
    END $$`,
  },
  {
    label: "fk subscriptions.license_id → licenses",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='subscriptions_license_id_fk') THEN
        ALTER TABLE "subscriptions"
          ADD CONSTRAINT "subscriptions_license_id_fk"
          FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL;
      END IF;
    END $$`,
  },
  {
    label: "fk subscriptions.plan_id → plans",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='subscriptions_plan_id_fk') THEN
        ALTER TABLE "subscriptions"
          ADD CONSTRAINT "subscriptions_plan_id_fk"
          FOREIGN KEY ("plan_id") REFERENCES "plans"("id");
      END IF;
    END $$`,
  },
  {
    label: "uniq subscriptions.mollie_subscription_id",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_mollie_id_unique" ON "subscriptions" ("mollie_subscription_id")`,
  },
  {
    label: "idx subscriptions.user_id",
    sql: `CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "subscriptions" ("user_id")`,
  },
  {
    label: "idx subscriptions.organization_id",
    sql: `CREATE INDEX IF NOT EXISTS "subscriptions_org_idx" ON "subscriptions" ("organization_id")`,
  },
  {
    label: "idx subscriptions.status",
    sql: `CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status")`,
  },
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
    console.error(`  [${i + 1}/${STEPS.length}] ✗ ${step.label}: ${msg}`);
    process.exit(1);
  }
}
console.log("\nMigration 0002 applied.");
