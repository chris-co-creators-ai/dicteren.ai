-- 0027 — Growth-hacking CRM: prospect-verrijking (Clay-aligned) + AM-toewijzing
--
-- crm_contacts wordt een volwaardige GTM-prospect-rij: persoon + bedrijf + social-
-- bereik + scoring + outreach-status + toewijzing aan een AM. Structured kolommen
-- (filterbaar/sorteerbaar voor targeting) + een jsonb catch-all zodat een Clay→MCP
-- import nooit data verliest. Alles nullable/additief.

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS seniority text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS email_status text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_domain text,
  ADD COLUMN IF NOT EXISTS company_linkedin_url text,
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS company_size_range text,
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS revenue_range text,
  ADD COLUMN IF NOT EXISTS founded_year integer,
  ADD COLUMN IF NOT EXISTS tech_stack jsonb,
  ADD COLUMN IF NOT EXISTS keywords jsonb,
  ADD COLUMN IF NOT EXISTS followers_linkedin integer,
  ADD COLUMN IF NOT EXISTS followers_instagram integer,
  ADD COLUMN IF NOT EXISTS followers_facebook integer,
  ADD COLUMN IF NOT EXISTS followers_youtube integer,
  ADD COLUMN IF NOT EXISTS followers_substack integer,
  ADD COLUMN IF NOT EXISTS followers_own integer,
  ADD COLUMN IF NOT EXISTS total_reach integer,
  ADD COLUMN IF NOT EXISTS lead_score integer,
  ADD COLUMN IF NOT EXISTS temperature customer_temperature,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_channel text,
  ADD COLUMN IF NOT EXISTS touch_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_source text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment jsonb;

CREATE INDEX IF NOT EXISTS crm_contacts_assigned_idx ON public.crm_contacts (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS crm_contacts_industry_idx ON public.crm_contacts (industry);
CREATE INDEX IF NOT EXISTS crm_contacts_score_idx ON public.crm_contacts (lead_score);
