-- Dicteren.ai — Publieke contact/partnership-messages + rate-limit.
-- IP wordt SHA-256 gehasht voordat opgeslagen (GDPR + spam-detectie).

ALTER TYPE "public"."affiliate_status" ADD VALUE IF NOT EXISTS 'pending' BEFORE 'active';

CREATE TYPE "public"."contact_message_status" AS ENUM ('new', 'in_progress', 'closed', 'spam');

CREATE TYPE "public"."contact_message_kind" AS ENUM ('general', 'sales', 'support', 'partnership', 'quote_request');

CREATE TABLE "public"."contact_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" "public"."contact_message_kind" NOT NULL DEFAULT 'general',
  "name" text NOT NULL,
  "email" text NOT NULL,
  "company" text,
  "phone" text,
  "subject" text,
  "message" text NOT NULL,
  "metadata" jsonb,
  "ip_hash" text,
  "user_agent" text,
  "status" "public"."contact_message_status" NOT NULL DEFAULT 'new',
  "assigned_to_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "linked_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "linked_affiliate_id" uuid REFERENCES "public"."affiliates"("id") ON DELETE SET NULL,
  "admin_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "contact_messages_status_idx" ON "public"."contact_messages" ("status");
CREATE INDEX "contact_messages_kind_idx" ON "public"."contact_messages" ("kind");
CREATE INDEX "contact_messages_created_idx" ON "public"."contact_messages" ("created_at" DESC);

CREATE TABLE "public"."rate_limit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "bucket_key" text NOT NULL,
  "ip_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "rate_limit_events_lookup_idx" ON "public"."rate_limit_events" ("bucket_key", "ip_hash", "created_at" DESC);
