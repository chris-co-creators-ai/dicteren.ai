-- Offerte-creator voor zakelijke klanten (PRD: offerte-creator)
-- Additief. crm_offertes bewaart per zakelijke CRM-lead een offerte met
-- uniek nummer, een prijs-snapshot (line_items + net/vat/gross) en status.

CREATE TABLE IF NOT EXISTS "public"."crm_offertes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "crm_organization_id" uuid NOT NULL REFERENCES "public"."crm_organizations"("id") ON DELETE CASCADE,
  "quote_number" text NOT NULL,
  "status" text NOT NULL DEFAULT 'concept',
  "seats" integer NOT NULL DEFAULT 1,
  "period" text NOT NULL DEFAULT 'yearly',
  "template_key" text NOT NULL DEFAULT 'merk',
  "line_items" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "net_cents" integer NOT NULL DEFAULT 0,
  "vat_cents" integer NOT NULL DEFAULT 0,
  "gross_cents" integer NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'EUR',
  "valid_until" date,
  "intro_text" text,
  "closing_text" text,
  "notes" text,
  "pdf_r2_key" text,
  "created_by_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_offertes_quote_number_unique"
  ON "public"."crm_offertes" ("quote_number");

CREATE INDEX IF NOT EXISTS "crm_offertes_org_idx"
  ON "public"."crm_offertes" ("crm_organization_id");
