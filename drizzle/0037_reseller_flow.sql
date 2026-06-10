-- Reseller-onboarding-flow (PRD: .claude/prds/crm-reseller-flow)
-- Alles additief. NB: ALTER TYPE ... ADD VALUE kan niet binnen een
-- transactieblok — elk statement los uitvoeren (Neon MCP run_sql per stuk).

ALTER TYPE "public"."crm_org_status" ADD VALUE IF NOT EXISTS 'reseller';

ALTER TYPE "public"."customer_stage" ADD VALUE IF NOT EXISTS 'reseller';

ALTER TYPE "public"."crm_event_kind" ADD VALUE IF NOT EXISTS 'reseller_promoted';

ALTER TABLE "public"."crm_organizations"
  ADD COLUMN IF NOT EXISTS "reseller_commission_pct" numeric(5,2),
  ADD COLUMN IF NOT EXISTS "reseller_recurring" boolean,
  ADD COLUMN IF NOT EXISTS "reseller_expected_clients" integer,
  ADD COLUMN IF NOT EXISTS "promoted_affiliate_id" uuid REFERENCES "public"."affiliates"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "public"."crm_reseller_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "crm_organization_id" uuid NOT NULL REFERENCES "public"."crm_organizations"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "done_at" timestamptz,
  "done_by_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crm_reseller_steps_org_idx"
  ON "public"."crm_reseller_steps" ("crm_organization_id", "position");

CREATE TABLE IF NOT EXISTS "public"."crm_org_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "crm_organization_id" uuid NOT NULL REFERENCES "public"."crm_organizations"("id") ON DELETE CASCADE,
  "r2_key" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "uploaded_by_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crm_org_attachments_org_idx"
  ON "public"."crm_org_attachments" ("crm_organization_id");
