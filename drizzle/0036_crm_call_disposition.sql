-- Call-center dispositions in het CRM.
-- crm_organizations krijgt: laatste beluitkomst (zichtbaar in het overview) + twee
-- permanente vlaggen (do_not_call = AVG-opt-out, wrong_number = datakwaliteit-signaal).
-- De dispositie-set zelf leeft in code (crmCallDisposition.ts), de waarden landen als
-- tekst in crm_org_tasks.kind en crm_events.

ALTER TABLE crm_organizations
  ADD COLUMN IF NOT EXISTS last_disposition text,
  ADD COLUMN IF NOT EXISTS last_disposition_at timestamptz,
  ADD COLUMN IF NOT EXISTS do_not_call boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wrong_number boolean NOT NULL DEFAULT false;

-- Snel filteren op openstaande acties (bellijst) en op de twee vlaggen.
CREATE INDEX IF NOT EXISTS crm_org_next_action_idx ON crm_organizations (next_action_at)
  WHERE next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_org_do_not_call_idx ON crm_organizations (do_not_call)
  WHERE do_not_call = true;
CREATE INDEX IF NOT EXISTS crm_org_wrong_number_idx ON crm_organizations (wrong_number)
  WHERE wrong_number = true;
