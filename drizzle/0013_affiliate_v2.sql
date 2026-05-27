-- 0013 — Affiliate v2: per-customer-type commissies, slug-URLs, lockup, payouts
--
-- Wijzigingen:
--   1. affiliates: slug + display_name + welcome_message + avatar_url
--   2. affiliates: consumer_* + business_* commissie-kolommen met duration_months
--   3. affiliate_commissions: unlocks_at, is_renewal, sequence_number,
--      voided_reason, payout_id
--   4. Nieuwe tabel affiliate_payouts (maandelijkse batches)
--   5. Audit-actions (geen DB-change, alleen TS-uitbreiding)
--
-- Backward-compat: oude commission_* kolommen blijven staan (defaults nul).
-- Nieuwe code gebruikt de consumer_* / business_* kolommen.

-- ───── 1. Slug + display ─────────────────────────────────────

ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "slug" text;
CREATE UNIQUE INDEX IF NOT EXISTS "affiliates_slug_unique"
  ON "public"."affiliates" ("slug");

ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "display_name" text;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "welcome_message" text;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "avatar_url" text;

-- ───── 2. Per-customer-type commissie ────────────────────────

ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "consumer_commission_type" "affiliate_commission_type";
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "consumer_commission_pct" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "consumer_commission_fixed_cents" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "consumer_commission_duration_months" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "consumer_recurring_commission_pct" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "consumer_recurring_commission_fixed_cents" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "business_commission_type" "affiliate_commission_type";
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "business_commission_pct" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "business_commission_fixed_cents" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "business_commission_duration_months" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "business_recurring_commission_pct" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "business_recurring_commission_fixed_cents" integer NOT NULL DEFAULT 0;

-- Minimum-payout-drempel per affiliate (in cents, default 2500 = €25)
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "minimum_payout_cents" integer NOT NULL DEFAULT 2500;

-- approved_at: wanneer ging affiliate van pending naar active
ALTER TABLE "public"."affiliates"
  ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;

-- ───── 3. affiliate_commissions: lockup + renewal-tracking ───

ALTER TABLE "public"."affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "unlocks_at" timestamptz;
ALTER TABLE "public"."affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "is_renewal" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "sequence_number" integer NOT NULL DEFAULT 1;
ALTER TABLE "public"."affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "voided_reason" text;
ALTER TABLE "public"."affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "payout_id" uuid;
ALTER TABLE "public"."affiliate_commissions"
  ADD COLUMN IF NOT EXISTS "customer_type" "customer_type";

CREATE INDEX IF NOT EXISTS "affiliate_commissions_unlocks_idx"
  ON "public"."affiliate_commissions" ("unlocks_at");
CREATE INDEX IF NOT EXISTS "affiliate_commissions_payout_idx"
  ON "public"."affiliate_commissions" ("payout_id");

-- ───── 4. affiliate_payouts ──────────────────────────────────

CREATE TYPE "affiliate_payout_status" AS ENUM (
  'scheduled',
  'processing',
  'paid',
  'failed',
  'canceled'
);

CREATE TABLE IF NOT EXISTS "public"."affiliate_payouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliate_id" uuid NOT NULL REFERENCES "public"."affiliates"("id") ON DELETE CASCADE,
  "period_year" integer NOT NULL,
  "period_month" integer NOT NULL,
  "total_cents" integer NOT NULL,
  "commission_count" integer NOT NULL,
  "status" "affiliate_payout_status" NOT NULL DEFAULT 'scheduled',
  "sepa_batch_ref" text,
  "scheduled_at" timestamptz NOT NULL DEFAULT now(),
  "sent_at" timestamptz,
  "paid_at" timestamptz,
  "failed_reason" text,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "affiliate_payouts_affiliate_idx"
  ON "public"."affiliate_payouts" ("affiliate_id");
CREATE INDEX IF NOT EXISTS "affiliate_payouts_status_idx"
  ON "public"."affiliate_payouts" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_payouts_period_unique"
  ON "public"."affiliate_payouts" ("affiliate_id", "period_year", "period_month");

-- Voeg de FK toe nadat de tabel bestaat
ALTER TABLE "public"."affiliate_commissions"
  DROP CONSTRAINT IF EXISTS "affiliate_commissions_payout_id_fk";
ALTER TABLE "public"."affiliate_commissions"
  ADD CONSTRAINT "affiliate_commissions_payout_id_fk"
    FOREIGN KEY ("payout_id") REFERENCES "public"."affiliate_payouts"("id") ON DELETE SET NULL;

-- ───── 5. email_category enum: affiliate-emails ──────────────

ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'affiliate_approved';
ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'affiliate_first_commission';
ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'affiliate_payout_scheduled';
ALTER TYPE "email_category" ADD VALUE IF NOT EXISTS 'affiliate_payout_paid';
