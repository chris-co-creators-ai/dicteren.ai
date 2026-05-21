import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

// Each entry is one SQL statement. Order matters.
const STEPS: { label: string; sql: string }[] = [
  // 1-2. Drop FK constraints that the rename/redirect would break (idempotent)
  // (most already dropped on first run, kept for re-runnability)
  { label: "drop fk licenses→organizations", sql: `ALTER TABLE "licenses" DROP CONSTRAINT IF EXISTS "licenses_organization_id_organizations_id_fk"` },
  { label: "drop fk orders→users", sql: `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_user_id_users_id_fk"` },
  { label: "drop fk orders→organizations", sql: `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_organization_id_organizations_id_fk"` },
  { label: "drop fk events→users", sql: `ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_user_id_users_id_fk"` },
  { label: "drop fk events→organizations", sql: `ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_organization_id_organizations_id_fk"` },

  // 3. Drop duplicate identity tables
  { label: "drop organization_members", sql: `DROP TABLE IF EXISTS "organization_members" CASCADE` },
  { label: "drop organizations", sql: `DROP TABLE IF EXISTS "organizations" CASCADE` },
  { label: "drop users", sql: `DROP TABLE IF EXISTS "users" CASCADE` },

  // 4. Licenses schema changes — rename + seats + add idx user_id
  { label: "rename licenses.max_activations", sql: `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licenses' AND column_name='max_activations') THEN ALTER TABLE "licenses" RENAME COLUMN "max_activations" TO "max_activations_per_seat"; END IF; END $$` },
  { label: "add licenses.seats", sql: `ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "seats" integer NOT NULL DEFAULT 1` },

  // 5. license_activations.user_id
  { label: "add license_activations.user_id", sql: `ALTER TABLE "license_activations" ADD COLUMN IF NOT EXISTS "user_id" uuid` },

  // 6. Cross-schema FKs to neon_auth
  { label: "fk licenses.user_id → neon_auth.user", sql: `ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL` },
  { label: "fk licenses.organization_id → neon_auth.organization", sql: `ALTER TABLE "licenses" ADD CONSTRAINT "licenses_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE SET NULL` },
  { label: "fk orders.user_id → neon_auth.user", sql: `ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL` },
  { label: "fk orders.organization_id → neon_auth.organization", sql: `ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE SET NULL` },
  { label: "fk events.user_id → neon_auth.user", sql: `ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL` },
  { label: "fk events.organization_id → neon_auth.organization", sql: `ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE SET NULL` },
  { label: "fk license_activations.user_id → neon_auth.user", sql: `ALTER TABLE "license_activations" ADD CONSTRAINT "activations_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL` },

  // 7. Indexes
  { label: "idx licenses.user_id", sql: `CREATE INDEX IF NOT EXISTS "licenses_user_idx" ON "licenses" ("user_id")` },
  { label: "idx licenses.organization_id", sql: `CREATE INDEX IF NOT EXISTS "licenses_org_idx" ON "licenses" ("organization_id")` },
  { label: "idx license_activations.user_id", sql: `CREATE INDEX IF NOT EXISTS "activations_user_idx" ON "license_activations" ("user_id")` },

  // 8. plans.is_per_seat
  { label: "add plans.is_per_seat", sql: `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "is_per_seat" boolean NOT NULL DEFAULT false` },

  // 9. organization_billing table
  {
    label: "create organization_billing",
    sql: `CREATE TABLE IF NOT EXISTS "organization_billing" (
      "organization_id" uuid PRIMARY KEY,
      "billing_email" text,
      "vat_number" text,
      "country_code" text,
      "address_line_1" text,
      "address_line_2" text,
      "postal_code" text,
      "city" text,
      "purchase_order_number" text,
      "notes" text,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )`,
  },
  {
    label: "fk organization_billing.organization_id → neon_auth.organization",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='organization_billing_organization_id_fk') THEN
        ALTER TABLE "organization_billing"
          ADD CONSTRAINT "organization_billing_organization_id_fk"
          FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE;
      END IF;
    END $$`,
  },
];

console.log(`Running ${STEPS.length} statements`);

for (const [i, step] of STEPS.entries()) {
  try {
    await sql.query(step.sql);
    console.log(`  [${i + 1}/${STEPS.length}] ✓ ${step.label}`);
  } catch (err) {
    const msg = (err as Error).message;
    // Idempotent: skip "already exists" / "does not exist" type errors
    if (/already exists|does not exist/i.test(msg)) {
      console.log(`  [${i + 1}/${STEPS.length}] − ${step.label} (skipped: ${msg.split("\n")[0]})`);
      continue;
    }
    console.error(`  [${i + 1}/${STEPS.length}] ✗ ${step.label}`);
    console.error(`    ${msg}`);
    process.exit(1);
  }
}

console.log("\nMigration 0001 applied.");
