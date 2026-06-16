-- Reseller-funnel op persoon-niveau (crm_contacts).
-- De funnel werft losse AI-experts (crm_contacts), geen bedrijven. Deze velden
-- dragen de funnel-state: de unieke deck-link + verstuur/bezoek/aanmeld-
-- markeringen, de aangeleverde aanmeld-data, en de promote-brug naar de
-- affiliate. De brug bestond alleen op crm_organizations (migratie 0037); een
-- los persoon kon niet gepromoveerd worden. FK in de migratie (geen drizzle
-- .references) om circulaire schema-import te vermijden.

ALTER TYPE "public"."crm_event_kind" ADD VALUE IF NOT EXISTS 'deck_sent';
ALTER TYPE "public"."crm_event_kind" ADD VALUE IF NOT EXISTS 'deck_visited';
ALTER TYPE "public"."crm_event_kind" ADD VALUE IF NOT EXISTS 'application_received';

ALTER TABLE "public"."crm_contacts"
  ADD COLUMN IF NOT EXISTS "deck_token" text,
  ADD COLUMN IF NOT EXISTS "deck_sent_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "deck_visited_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "applied_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "applied_logo_r2_key" text,
  ADD COLUMN IF NOT EXISTS "applied_quote" text,
  ADD COLUMN IF NOT EXISTS "applied_quote_author" text,
  ADD COLUMN IF NOT EXISTS "promoted_affiliate_id" uuid REFERENCES "public"."affiliates"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "crm_contacts_deck_token_idx" ON "public"."crm_contacts" ("deck_token");
CREATE INDEX IF NOT EXISTS "crm_contacts_promoted_affiliate_idx" ON "public"."crm_contacts" ("promoted_affiliate_id");
