-- 0017 — Unified contacts dedup-view
--
-- Eén live view over alle 5 contactbronnen voor cross-table dedup-check.
-- Geen materialized view: live data is belangrijker dan query-snelheid bij
-- onze volumes (honderden rijen). Bij groei naar duizenden migreren we naar
-- materialized + refresh-triggers.
--
-- Functional indexes op email_norm (lower+trim) maken de UNION-query snel.

CREATE INDEX IF NOT EXISTS auth_user_email_norm_idx
  ON auth.user (lower(trim(email)));

CREATE INDEX IF NOT EXISTS crm_contacts_email_norm_idx
  ON public.crm_contacts (lower(trim(email)));

CREATE INDEX IF NOT EXISTS partner_orgs_email_norm_idx
  ON public.partner_organizations (lower(trim(email)))
  WHERE email IS NOT NULL;

CREATE OR REPLACE VIEW public.unified_contacts_v AS
SELECT
  id::text                    AS entity_id,
  'user'::text                AS source,
  lower(trim(email))           AS email_norm,
  name                         AS display_name,
  NULL::text                   AS kvk,
  NULL::uuid                   AS owner_user_id,
  "createdAt"                  AS created_at
FROM auth.user
UNION ALL
SELECT
  id::text,
  'crm_contact',
  lower(trim(email)),
  name,
  NULL,
  NULL,
  created_at
FROM public.crm_contacts
UNION ALL
SELECT
  id::text,
  'crm_org',
  NULL,
  name,
  kvk,
  account_owner_id,
  created_at
FROM public.crm_organizations
UNION ALL
SELECT
  id::text,
  'partner',
  lower(trim(email)),
  organization_name,
  NULL,
  NULL,
  created_at
FROM public.partner_organizations
UNION ALL
SELECT
  id::text,
  'affiliate',
  lower(trim(contact_email)),
  name,
  NULL,
  NULL,
  created_at
FROM public.affiliates;
