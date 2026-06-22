-- 0044_account_type_consent.sql
-- PRD crm-inbound-outbound-split, Fase 1: segment + consent op auth.user (additief).
-- Nullable + default zodat de bestaande users backfillen en sign-up nooit breekt.
-- account_type: 'personal' | 'business' (gevuld door de Persoonlijk/Zakelijk-toggle).

ALTER TABLE auth."user"
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;

ALTER TABLE auth."user" DROP CONSTRAINT IF EXISTS auth_user_account_type_check;
ALTER TABLE auth."user"
  ADD CONSTRAINT auth_user_account_type_check CHECK (account_type IN ('personal', 'business'));
