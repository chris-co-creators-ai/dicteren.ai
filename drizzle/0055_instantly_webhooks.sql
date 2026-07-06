-- 0055 — Instantly lifecycle webhooks + outreach suppression.
-- CRM blijft de waarheid; Instantly levert uitvoerings-events. Deze migratie
-- voegt idempotente webhook-audit, de ontbrekende crm_event_kind-waarden en
-- contact-level suppression flags toe.

ALTER TYPE "crm_event_kind" ADD VALUE IF NOT EXISTS 'email_replied';
ALTER TYPE "crm_event_kind" ADD VALUE IF NOT EXISTS 'email_unsubscribed';
ALTER TYPE "crm_event_kind" ADD VALUE IF NOT EXISTS 'meeting_booked';
ALTER TYPE "crm_event_kind" ADD VALUE IF NOT EXISTS 'meeting_completed';
ALTER TYPE "crm_event_kind" ADD VALUE IF NOT EXISTS 'meeting_no_show';
ALTER TYPE "crm_event_kind" ADD VALUE IF NOT EXISTS 'campaign_completed';

ALTER TABLE "crm_contacts"
  ADD COLUMN IF NOT EXISTS "email_unsubscribed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "not_interested" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "do_not_contact" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suppression_reason" text,
  ADD COLUMN IF NOT EXISTS "suppression_marked_at" timestamptz;

CREATE TABLE IF NOT EXISTS "instantly_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dedupe_key" text NOT NULL,
  "event_type" text NOT NULL,
  "lead_email" text,
  "campaign_id" text,
  "timestamp_bucket" timestamptz NOT NULL,
  "payload" jsonb NOT NULL,
  "crm_contact_id" uuid REFERENCES "crm_contacts"("id") ON DELETE SET NULL,
  "crm_organization_id" uuid REFERENCES "crm_organizations"("id") ON DELETE SET NULL,
  "crm_event_id" uuid,
  "signal_id" uuid,
  "skipped_reason" text,
  "processed_at" timestamptz,
  "received_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "instantly_webhook_events_dedupe_idx"
  ON "instantly_webhook_events" ("dedupe_key");
CREATE INDEX IF NOT EXISTS "instantly_webhook_events_event_idx"
  ON "instantly_webhook_events" ("event_type");
CREATE INDEX IF NOT EXISTS "instantly_webhook_events_contact_idx"
  ON "instantly_webhook_events" ("crm_contact_id");
CREATE INDEX IF NOT EXISTS "instantly_webhook_events_received_idx"
  ON "instantly_webhook_events" ("received_at");
