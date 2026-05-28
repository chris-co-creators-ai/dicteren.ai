-- Migration 0020 — Clay-stijl enrichment-laag voor het CRM.
--
-- Twee nieuwe tabellen die fundamenteel anders werken dan crm_custom_columns:
--
-- 1. crm_enrichment_facts
--    Eén rij per (entity × field × provider). Nooit overschrijven. Bij re-scrape:
--    nieuwe rij erbij. Resolver-service kiest de winnende waarde per veld via
--    ORDER BY confidence DESC, verified_at DESC LIMIT 1.
--    Voor velden zoals work_email, phone, job_title, linkedin_url — alles wat
--    uit een scrape of API komt en provenance + confidence nodig heeft.
--
-- 2. crm_signals
--    Trigger-laag voor AM-werk. Eén signal → cron-routing-service maakt
--    automatisch een task aan via autoTaskForOrgPaymentIssue-pattern uit
--    crmDeals.ts. status='new' → 'actioned' / 'dismissed' / 'expired'.
--
-- Beide tabellen hebben een CHECK-constraint dat tenminste één van
-- contact_id of organization_id NOT NULL is — anders is de fact/signal nergens
-- aan gekoppeld.

CREATE TABLE crm_enrichment_facts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES crm_organizations(id) ON DELETE CASCADE,
  field_key       text NOT NULL,
  value           text NOT NULL,
  provider        text NOT NULL,
  confidence      smallint NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  source_url      text,
  verified_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_enrichment_facts_entity_present
    CHECK (contact_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE INDEX crm_enrichment_facts_contact_field_idx
  ON crm_enrichment_facts (contact_id, field_key);
CREATE INDEX crm_enrichment_facts_org_field_idx
  ON crm_enrichment_facts (organization_id, field_key);
CREATE INDEX crm_enrichment_facts_resolver_idx
  ON crm_enrichment_facts (field_key, confidence DESC, verified_at DESC);

CREATE TABLE crm_signals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id       uuid REFERENCES crm_contacts(id) ON DELETE CASCADE,
  organization_id  uuid REFERENCES crm_organizations(id) ON DELETE CASCADE,
  kind             text NOT NULL,
  payload          jsonb NOT NULL,
  detected_at      timestamptz NOT NULL DEFAULT now(),
  score            smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  status           text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'actioned', 'dismissed', 'expired')),
  actioned_task_id uuid REFERENCES crm_org_tasks(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_signals_entity_present
    CHECK (contact_id IS NOT NULL OR organization_id IS NOT NULL)
);

CREATE INDEX crm_signals_routing_idx
  ON crm_signals (status, score DESC);
CREATE INDEX crm_signals_org_status_idx
  ON crm_signals (organization_id, status);
CREATE INDEX crm_signals_contact_status_idx
  ON crm_signals (contact_id, status);
