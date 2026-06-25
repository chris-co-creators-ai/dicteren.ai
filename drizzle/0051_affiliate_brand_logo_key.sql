-- 0051_affiliate_brand_logo_key.sql
-- De partner uploadt een logo/portret bij de aanmelding (R2-intake-key op de
-- crm_contact). Bij publiceren zetten we die key op de affiliate, zodat de
-- landingpagina 'm kan tonen (signed op render — de bucket is niet publiek).
-- brandLogoUrl blijft voor handmatig gezette publieke URL's. Additief, nullable.
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS brand_logo_r2_key text;
