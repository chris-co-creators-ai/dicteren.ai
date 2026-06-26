-- 0052_prospect_funnel_split.sql
-- Splitst de CRM-prospect-funnel in twee sporen: eindklant-werving en reseller-
-- werving. Tot nu deelden beide één stage-as (customer_stage) en één bord, waardoor
-- gescrapede reseller-bureaus tussen de eindklant-leads belandden. Een discriminator
-- op het contact (de waarheid) + op de lijst (de ingang) stuurt voortaan het bord,
-- het side-panel en de funnel-cijfers. Additief, idempotent. Reseller-kolommen
-- blijven afgeleid van de deck-timestamps (geen nieuwe stage-enum nodig).
-- Zie .claude/prds/partner-onboarding.

-- 1) Funnel-type op het contact = de waarheid. Verplicht, default 'eindklant'
--    (het veilige spoor: een onbekend contact is een eindklant tot we beter weten).
DO $$ BEGIN
  CREATE TYPE prospect_type AS ENUM ('eindklant', 'reseller');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS prospect_type prospect_type NOT NULL DEFAULT 'eindklant';

-- 2) Funnel-type op de lijst = de ingang bij "+ Nieuwe lijst" en de default voor
--    contacts die erin landen (import/handmatig). Het contact-type blijft leidend
--    voor de bord-indeling; de lijst zet alleen de default.
DO $$ BEGIN
  CREATE TYPE list_type AS ENUM ('eindklant', 'reseller');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE lead_lists
  ADD COLUMN IF NOT EXISTS list_type list_type NOT NULL DEFAULT 'eindklant';

-- 3) Backfill: alleen op HARDE reseller-signalen. Geen gok op lijstnaam.
--    a) het contact zit al in de deck-/aanmeld-funnel, of is gepromoveerd, OF
--    b) z'n org is een reseller-traject (status reseller / source reseller_recruitment),
--       of kreeg de dispositie send_deck / een deck-next-action.
--    Meet op 2026-06-26: dit raakt 11 van 241 contacts. De overige 230 hebben geen
--    data-signaal (verse gescrapede leads, nog geen dispositie) en blijven 'eindklant'
--    tot de AM de lijst expliciet omzet (bulk-actie, fase 2). Gerichte UPDATE met WHERE.
UPDATE crm_contacts c SET prospect_type = 'reseller'
WHERE c.deck_token IS NOT NULL
   OR c.deck_sent_at IS NOT NULL
   OR c.applied_at IS NOT NULL
   OR c.promoted_affiliate_id IS NOT NULL
   OR EXISTS (
        SELECT 1 FROM crm_organizations o
        WHERE o.id = c.crm_organization_id
          AND (o.status = 'reseller'
               OR o.source = 'reseller_recruitment'
               OR o.last_disposition = 'send_deck'
               OR o.next_action ILIKE '%deck%')
      );

-- Bord-/lijst-filtering per type.
CREATE INDEX IF NOT EXISTS crm_contacts_prospect_type_idx ON crm_contacts (prospect_type);
