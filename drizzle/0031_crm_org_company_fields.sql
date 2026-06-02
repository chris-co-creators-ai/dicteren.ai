-- Dicteren.ai — migratie 0031
-- Uitgebreide bedrijfsattributen op crm_organizations zodat de Organisaties-tab
-- een zelfstandige inline-editbare grid kan zijn (peer van de Personen-grid).
-- Company-enrichment leeft hiermee op org-niveau i.p.v. alleen op het contact.
-- Additief, non-breaking. Toegepast op Neon (fragrant-silence-83171500).

ALTER TABLE crm_organizations
  ADD COLUMN IF NOT EXISTS branche_vereniging text,
  ADD COLUMN IF NOT EXISTS aantal_vestigingen integer,
  ADD COLUMN IF NOT EXISTS hoofdkantoor text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS revenue_range text,
  ADD COLUMN IF NOT EXISTS total_reach integer,
  ADD COLUMN IF NOT EXISTS specialisatie text;
