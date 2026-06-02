-- 0029 — Provincie + huisnummer op CRM-organisaties (NL-adres via PDOK)
--
-- Additief + nullable. province wordt gevuld door de PDOK-lookup
-- (postcode + huisnummer) of handmatig via de provincie-dropdown.

ALTER TABLE public.crm_organizations
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS house_number text;

CREATE INDEX IF NOT EXISTS crm_organizations_province_idx
  ON public.crm_organizations (province);
