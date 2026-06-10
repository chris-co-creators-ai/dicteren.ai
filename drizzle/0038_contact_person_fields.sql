-- Contactpersoon-velden voor AM-belwerk (Personen-grid + side-panel).
-- first_name/last_name bestonden al (Clay person-enrichment, migratie 0020);
-- alleen mobile_phone is nieuw. De grid krijgt Voornaam/Achternaam/
-- Functietitel/Mobiel-kolommen die deze velden inline editbaar maken;
-- `name` blijft de display/fallback en wordt gesynct bij edits.

ALTER TABLE "public"."crm_contacts"
  ADD COLUMN IF NOT EXISTS "mobile_phone" text;
