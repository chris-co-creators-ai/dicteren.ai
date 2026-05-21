-- 0001_neon_auth_consolidation.sql
--
-- Consolidate identity tables: drop public.users/organizations/organization_members,
-- redirect FKs in licenses/orders/events to neon_auth.user and neon_auth.organization,
-- add seats + max_activations_per_seat to licenses, add organization_billing,
-- and is_per_seat flag on plans.
--
-- This is applied via scripts/apply-0001.ts (drizzle-kit can't auto-resolve
-- the rename/redirect without interactive prompts).

-- 1. Drop FK constraints on tables that reference the old public.users/organizations
ALTER TABLE "licenses" DROP CONSTRAINT IF EXISTS "licenses_user_id_users_id_fk";
ALTER TABLE "licenses" DROP CONSTRAINT IF EXISTS "licenses_organization_id_organizations_id_fk";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_user_id_users_id_fk";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_organization_id_organizations_id_fk";
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_user_id_users_id_fk";
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_organization_id_organizations_id_fk";

-- 2. Drop the duplicate identity tables (all empty as of 2026-05-21)
DROP TABLE IF EXISTS "organization_members" CASCADE;
DROP TABLE IF EXISTS "organizations" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 3. Rename licenses.max_activations -> max_activations_per_seat and add seats
ALTER TABLE "licenses" RENAME COLUMN "max_activations" TO "max_activations_per_seat";
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "seats" integer NOT NULL DEFAULT 1;

-- 4. Add user_id to license_activations (which user a seat is bound to)
ALTER TABLE "license_activations" ADD COLUMN IF NOT EXISTS "user_id" uuid;

-- 5. Cross-schema FKs to neon_auth.user and neon_auth.organization
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL;
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE SET NULL;

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE SET NULL;

ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL;
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE SET NULL;

ALTER TABLE "license_activations" ADD CONSTRAINT "activations_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE SET NULL;

-- 6. Indexes for new FK columns
CREATE INDEX IF NOT EXISTS "licenses_user_idx" ON "licenses" ("user_id");
CREATE INDEX IF NOT EXISTS "licenses_org_idx" ON "licenses" ("organization_id");
CREATE INDEX IF NOT EXISTS "activations_user_idx" ON "license_activations" ("user_id");

-- 7. is_per_seat flag on plans (consumer = false, organization = true)
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "is_per_seat" boolean NOT NULL DEFAULT false;

-- 8. Organization billing extension (1-1 with neon_auth.organization)
CREATE TABLE IF NOT EXISTS "organization_billing" (
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
);

ALTER TABLE "organization_billing"
  ADD CONSTRAINT "organization_billing_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE;
