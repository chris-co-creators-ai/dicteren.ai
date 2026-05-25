-- Dicteren.ai — Affiliate-programma voor commerciële resellers
-- Lifetime attributie via affiliate_referrals.user_id (uniek).
-- Eén commissie per order via affiliate_commissions.order_id (uniek).

CREATE TYPE "public"."affiliate_status" AS ENUM ('active', 'paused', 'disabled');

CREATE TYPE "public"."affiliate_commission_type" AS ENUM ('percentage', 'fixed_per_seat');

CREATE TYPE "public"."affiliate_commission_status" AS ENUM ('pending', 'payable', 'paid', 'voided');

CREATE TABLE "public"."affiliates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL,
  "name" text NOT NULL,
  "contact_email" text NOT NULL,
  "contact_phone" text,
  "user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "status" "public"."affiliate_status" NOT NULL DEFAULT 'active',
  "commission_type" "public"."affiliate_commission_type" NOT NULL DEFAULT 'percentage',
  "commission_pct" integer NOT NULL DEFAULT 0,
  "commission_fixed_cents" integer NOT NULL DEFAULT 0,
  "payout_method" text,
  "payout_details" jsonb,
  "internal_notes" text,
  "total_earned_cents" integer NOT NULL DEFAULT 0,
  "total_paid_cents" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "affiliates_code_unique" ON "public"."affiliates" ("code");
CREATE UNIQUE INDEX "affiliates_contact_email_unique" ON "public"."affiliates" ("contact_email");
CREATE UNIQUE INDEX "affiliates_user_unique" ON "public"."affiliates" ("user_id");
CREATE INDEX "affiliates_status_idx" ON "public"."affiliates" ("status");

CREATE TABLE "public"."affiliate_referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliate_id" uuid NOT NULL REFERENCES "public"."affiliates"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "organization_id" uuid REFERENCES "auth"."organization"("id") ON DELETE SET NULL,
  "attribution_source" text NOT NULL DEFAULT 'url-ref',
  "first_seen_at" timestamptz NOT NULL DEFAULT now(),
  "converted_at" timestamptz
);

CREATE UNIQUE INDEX "affiliate_referrals_user_unique" ON "public"."affiliate_referrals" ("user_id");
CREATE INDEX "affiliate_referrals_affiliate_idx" ON "public"."affiliate_referrals" ("affiliate_id");
CREATE INDEX "affiliate_referrals_org_idx" ON "public"."affiliate_referrals" ("organization_id");

CREATE TABLE "public"."affiliate_commissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "affiliate_id" uuid NOT NULL REFERENCES "public"."affiliates"("id") ON DELETE CASCADE,
  "referral_id" uuid REFERENCES "public"."affiliate_referrals"("id") ON DELETE SET NULL,
  "order_id" uuid REFERENCES "public"."orders"("id") ON DELETE SET NULL,
  "license_id" uuid REFERENCES "public"."licenses"("id") ON DELETE SET NULL,
  "payment_id" uuid REFERENCES "public"."payments"("id") ON DELETE SET NULL,
  "basis_amount_cents" integer NOT NULL,
  "seats" integer NOT NULL DEFAULT 1,
  "commission_type" "public"."affiliate_commission_type" NOT NULL,
  "commission_pct" integer NOT NULL,
  "commission_fixed_cents" integer NOT NULL,
  "amount_cents" integer NOT NULL,
  "status" "public"."affiliate_commission_status" NOT NULL DEFAULT 'pending',
  "paid_at" timestamptz,
  "paid_reference" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "affiliate_commissions_order_unique" ON "public"."affiliate_commissions" ("order_id");
CREATE INDEX "affiliate_commissions_affiliate_idx" ON "public"."affiliate_commissions" ("affiliate_id");
CREATE INDEX "affiliate_commissions_status_idx" ON "public"."affiliate_commissions" ("status");
