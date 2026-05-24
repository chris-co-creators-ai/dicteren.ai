-- Dicteren.ai — Migration 0004
-- Partner-organisaties (maatschappelijke outreach pipeline) + partner license-type.

-- 1. Voeg "partner" enum-waarde toe (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'partner'
      AND enumtypid = 'license_type'::regtype
  ) THEN
    ALTER TYPE license_type ADD VALUE 'partner';
  END IF;
END $$;

-- 2. Tabel partner_organizations.
CREATE TABLE IF NOT EXISTS partner_organizations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id           text NOT NULL,
  priority              text,
  segment               text,
  organization_name     text NOT NULL,
  organization_type     text,
  why_relevant          text,
  partnership_angle     text,
  opening_line          text,
  offer                 text,
  decision_maker        text,
  email                 text,
  phone                 text,
  address               text,
  city                  text,
  website               text,
  contact_url           text,
  source_url            text,
  source_status         text,
  source_verified_at    text,
  account_owner         text,
  outreach_status       text DEFAULT 'Nieuw',
  last_contact_date     text,
  next_action           text,
  follow_up_date        text,
  response_summary      text,
  pilot_status          text DEFAULT 'Nog niet gestart',
  free_codes_count      integer,
  license_id            uuid REFERENCES licenses(id) ON DELETE SET NULL,
  gdpr_notes            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexen.
CREATE UNIQUE INDEX IF NOT EXISTS partner_orgs_external_id_unique
  ON partner_organizations (external_id);
CREATE INDEX IF NOT EXISTS partner_orgs_outreach_status_idx
  ON partner_organizations (outreach_status);
CREATE INDEX IF NOT EXISTS partner_orgs_priority_idx
  ON partner_organizations (priority);
