-- Dicteren.ai — migratie 0032
-- Interactief belscript + reseller-notities per org, en een gedeelde FAQ-
-- knowledgebase voor account managers. Additief. Toegepast op Neon.

ALTER TABLE crm_organizations
  ADD COLUMN IF NOT EXISTS call_script text,
  ADD COLUMN IF NOT EXISTS reseller_notes text;

CREATE TABLE IF NOT EXISTS crm_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  created_by_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
