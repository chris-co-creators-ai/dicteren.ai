-- 0050_partner_apply_brand_identity.sql
-- Partner-aanmelding: portretfoto + introtekst erbij. Sectie 07 van de Partner Deck
-- ("je eigen landingpagina") vraagt portretfoto + bedrijfslogo + introtekst van
-- 60-100 woorden. Logo + merkkleur staan al (migratie 0042/0049); dit voegt de
-- ontbrekende twee toe. Additief, idempotent, nullable.
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS applied_portrait_r2_key text;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS applied_intro_text text;
