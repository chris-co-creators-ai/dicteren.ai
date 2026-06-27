-- 0053: partner-mail-categorieën
-- Haalt de partner-welkomstmail en het brand-identity-verzoek uit de "other"-hoop
-- in /admin/emails. Additieve enum-waarden, niet-destructief, backwards compatible
-- (oude code blijft werken). IF NOT EXISTS = idempotent.
--
-- Let op: een nieuwe enum-waarde kan in Postgres niet in dezelfde transactie
-- gebruikt worden als waarin hij is toegevoegd. De backfill van bestaande rijen
-- (zie onder, los uitvoeren NA deze ALTER's) draait daarom als aparte statements.

ALTER TYPE email_category ADD VALUE IF NOT EXISTS 'partner_welcome';
ALTER TYPE email_category ADD VALUE IF NOT EXISTS 'brand_identity_request';

-- Backfill (apart uitvoeren na bovenstaande ALTER's zijn gecommit):
--
--   UPDATE email_logs SET category = 'partner_welcome'
--   WHERE category = 'other' AND subject = 'Welkom als partner van Dicteren.ai';
--
--   UPDATE email_logs SET category = 'brand_identity_request'
--   WHERE category = 'other' AND subject LIKE 'Wat we nodig hebben voor de partnership met %';
