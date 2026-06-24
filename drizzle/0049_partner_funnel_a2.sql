-- 0049_partner_funnel_a2.sql
-- Partner-onboarding A2: brand-identity bij de aanmelding + de handmatige AM-vink-
-- markers voor de 7-stage funnel-cockpit. Additief, idempotent. De funnel-kolom
-- blijft afgeleid (geen state-kolom). Zie .claude/prds/partner-onboarding.

-- Merkkleur die de prospect aanlevert bij de aanmelding (naast logo + quote).
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS applied_brand_color text;

-- "Afspraak rond" — de drie AM-vinkjes (timestamps). De waarden zelf (commissie-%,
-- verwachte klanten) leven op crm_organizations; dit zijn de bevestig-markers.
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS commission_discussed_at timestamptz;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS discount_agreed_at timestamptz;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS expected_clients_logged_at timestamptz;

-- "Brand identity controleren" — de goedkeuring-gate vóór publiceren.
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS brand_identity_approved_at timestamptz;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS brand_identity_approved_by uuid
  REFERENCES auth."user"(id) ON DELETE SET NULL;
