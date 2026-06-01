-- 0026 — Affiliate brandkit + CRM↔affiliate koppeling
--
-- Voor de reseller-flow: een AM werft een reseller (als CRM-org in z'n pijplijn),
-- maakt daarna de affiliate-record met een op-maat brandkit voor de slug-landing,
-- en linkt de CRM-org aan die affiliate zodat de werving traceerbaar blijft.

ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS brand_color text;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS brand_logo_url text;

ALTER TABLE public.crm_organizations ADD COLUMN IF NOT EXISTS affiliate_id uuid
  REFERENCES public.affiliates(id) ON DELETE SET NULL;

ALTER TYPE crm_org_source ADD VALUE IF NOT EXISTS 'reseller_recruitment';
