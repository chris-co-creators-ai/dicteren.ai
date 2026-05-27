-- 0015 — CRM B2B sales pipeline
--
-- Drie nieuwe tabellen voor de account-manager-initiated route:
--   crm_organizations : lead/prospect-orgs vóór auth.organization aanmaak
--   crm_contacts      : losse personen zonder auth.user
--   crm_events        : chronologische timeline per organisatie
--   crm_org_tasks     : taken per organisatie (zelfde patroon als partner_tasks)
--
-- + 3 nieuwe enums: crm_org_status, crm_org_source, crm_event_kind.

-- ───── Enums ─────

DO $$ BEGIN
  CREATE TYPE "public"."crm_org_status" AS ENUM (
    'lead', 'contacted', 'qualified', 'proposal_sent',
    'negotiating', 'won', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."crm_org_source" AS ENUM (
    'am_outreach', 'self_service', 'consumer_upgrade',
    'csv_import', 'lead_form'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."crm_event_kind" AS ENUM (
    'created', 'status_changed', 'field_updated',
    'contact_added', 'contact_removed',
    'email_sent', 'email_opened', 'email_clicked', 'email_bounced',
    'payment_link_generated', 'payment_link_sent', 'payment_link_resent',
    'payment_received', 'marked_paid_offline',
    'auth_org_created', 'consumer_sub_canceled',
    'note_added', 'task_added', 'task_completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ───── crm_organizations ─────

CREATE TABLE IF NOT EXISTS "public"."crm_organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bedrijfsgegevens
  "name" text NOT NULL,
  "kvk" text,
  "vat_number" text,
  "website" text,
  "address_line1" text,
  "address_line2" text,
  "postal_code" text,
  "city" text,
  "country_code" text DEFAULT 'NL',

  -- CRM-metadata
  "source" crm_org_source NOT NULL DEFAULT 'am_outreach',
  "status" crm_org_status NOT NULL DEFAULT 'lead',
  "temperature" customer_temperature,
  "account_owner_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "notes" text,
  "next_action" text,
  "next_action_at" timestamptz,

  -- Deal-data
  "proposed_seats" integer,
  "proposed_amount_cents" integer,
  "proposed_plan_slug" text,
  "discount_code" text,

  -- Mollie + Better-Auth koppeling
  "auth_organization_id" uuid REFERENCES "auth"."organization"("id") ON DELETE SET NULL,
  "mollie_customer_id" text,
  "payment_link_order_id" uuid,
  "payment_link_url" text,
  "payment_link_sent_at" timestamptz,
  "paid_at" timestamptz,

  "lost_reason" text,

  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crm_organizations_status_idx"
  ON "public"."crm_organizations" ("status");
CREATE INDEX IF NOT EXISTS "crm_organizations_owner_idx"
  ON "public"."crm_organizations" ("account_owner_id");
CREATE INDEX IF NOT EXISTS "crm_organizations_auth_org_idx"
  ON "public"."crm_organizations" ("auth_organization_id");
CREATE INDEX IF NOT EXISTS "crm_organizations_source_idx"
  ON "public"."crm_organizations" ("source");

-- ───── crm_contacts ─────

CREATE TABLE IF NOT EXISTS "public"."crm_contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "crm_organization_id" uuid REFERENCES "public"."crm_organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "role_at_company" text,
  "is_primary" boolean NOT NULL DEFAULT false,
  "auth_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crm_contacts_org_idx"
  ON "public"."crm_contacts" ("crm_organization_id");
CREATE INDEX IF NOT EXISTS "crm_contacts_email_idx"
  ON "public"."crm_contacts" ("email");
CREATE INDEX IF NOT EXISTS "crm_contacts_auth_user_idx"
  ON "public"."crm_contacts" ("auth_user_id");

-- ───── crm_events ─────

CREATE TABLE IF NOT EXISTS "public"."crm_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "crm_organization_id" uuid REFERENCES "public"."crm_organizations"("id") ON DELETE CASCADE,
  "crm_contact_id" uuid REFERENCES "public"."crm_contacts"("id") ON DELETE SET NULL,
  "actor_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "kind" crm_event_kind NOT NULL,
  "payload" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crm_events_org_idx"
  ON "public"."crm_events" ("crm_organization_id");
CREATE INDEX IF NOT EXISTS "crm_events_created_idx"
  ON "public"."crm_events" ("created_at");
CREATE INDEX IF NOT EXISTS "crm_events_kind_idx"
  ON "public"."crm_events" ("kind");

-- ───── crm_org_tasks ─────

CREATE TABLE IF NOT EXISTS "public"."crm_org_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "crm_organization_id" uuid NOT NULL REFERENCES "public"."crm_organizations"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'other',
  "due_at" timestamptz,
  "completed_at" timestamptz,
  "created_by_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "notes" text,
  "deleted_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "crm_org_tasks_org_idx"
  ON "public"."crm_org_tasks" ("crm_organization_id");
CREATE INDEX IF NOT EXISTS "crm_org_tasks_completed_idx"
  ON "public"."crm_org_tasks" ("completed_at");
