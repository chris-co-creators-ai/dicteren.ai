-- 0045_user_name_business_fields.sql
-- PRD crm-inbound-outbound-split, Fase 3: naam-split + business-capture op auth.user.
-- Volledig additief + nullable: `name` (core, NOT NULL) blijft de composed display-waarde
-- die alle mails/identity/admin lezen, dus geen bestaand proces breekt. first_name/last_name
-- gelden voor iedereen; company_name/job_title/team_size worden alleen bij de zakelijk-toggle
-- gevuld. Naamgeving spiegelt crm_contacts (first_name/last_name/job_title) zodat de
-- signup<->prospect-brug schoon koppelt.

ALTER TABLE auth."user"
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS team_size text;
