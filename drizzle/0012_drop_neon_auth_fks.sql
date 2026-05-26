-- 0012 — Drop stale neon_auth FKs op public.*
--
-- Bug: migration 0006 voegde nieuwe FKs toe naar auth.* maar de oude
-- DROP-statements gebruikten de verkeerde constraint-namen, waardoor
-- de oude FKs naar neon_auth.* zijn blijven hangen. Resultaat: nieuwe
-- orgs aangemaakt via Better Auth (alleen in auth.organization) kunnen
-- niet aan licenses/orders/subscriptions worden gekoppeld omdat de
-- neon_auth FK een referentie eist die niet bestaat.
--
-- Fix: drop alle neon_auth-FKs op public.* tabellen. De auth.*-FKs
-- blijven correct functioneren.
--
-- Test: na deze migration moet een verse auth.organization INSERT
-- gevolgd door een licenses INSERT met die organizationId succesvol
-- zijn.

ALTER TABLE "public"."licenses"
  DROP CONSTRAINT IF EXISTS "licenses_organization_id_fk";
ALTER TABLE "public"."licenses"
  DROP CONSTRAINT IF EXISTS "licenses_user_id_fk";

ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_organization_id_fk";
ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_user_id_fk";

ALTER TABLE "public"."subscriptions"
  DROP CONSTRAINT IF EXISTS "subscriptions_organization_id_fk";
ALTER TABLE "public"."subscriptions"
  DROP CONSTRAINT IF EXISTS "subscriptions_user_id_fk";

ALTER TABLE "public"."license_activations"
  DROP CONSTRAINT IF EXISTS "activations_user_id_fk";

ALTER TABLE "public"."email_logs"
  DROP CONSTRAINT IF EXISTS "email_logs_user_id_fk";

ALTER TABLE "public"."events"
  DROP CONSTRAINT IF EXISTS "events_user_id_fk";
ALTER TABLE "public"."events"
  DROP CONSTRAINT IF EXISTS "events_organization_id_fk";

ALTER TABLE "public"."organization_billing"
  DROP CONSTRAINT IF EXISTS "organization_billing_organization_id_fk";

ALTER TABLE "public"."user_billing"
  DROP CONSTRAINT IF EXISTS "user_billing_user_id_fk";
