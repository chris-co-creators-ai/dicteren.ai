-- Dicteren.ai — CRM pipeline + lead-lists + per-admin column-prefs.
-- Voor GTM-engineering: prospecting → MQL → SQL → customer overdracht.

CREATE TYPE "public"."customer_stage" AS ENUM ('lead', 'prospect', 'mql', 'sql', 'customer', 'lost', 'churned');
CREATE TYPE "public"."customer_temperature" AS ENUM ('cold', 'lukewarm', 'warm', 'hot');
CREATE TYPE "public"."list_color" AS ENUM ('blue', 'green', 'orange', 'red', 'purple', 'gray', 'navy', 'aqua');

CREATE TABLE "public"."customer_attributes" (
  "user_id" uuid PRIMARY KEY REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "stage" "public"."customer_stage",
  "temperature" "public"."customer_temperature",
  "assigned_to_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "notes" text,
  "custom_fields" jsonb,
  "last_activity_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."lead_lists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "color" "public"."list_color" NOT NULL DEFAULT 'blue',
  "owner_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "is_shared" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "lead_lists_owner_idx" ON "public"."lead_lists" ("owner_user_id");
CREATE INDEX "lead_lists_shared_idx" ON "public"."lead_lists" ("is_shared");

CREATE TABLE "public"."lead_list_members" (
  "list_id" uuid NOT NULL REFERENCES "public"."lead_lists"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "added_by_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "added_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("list_id", "user_id")
);

CREATE INDEX "lead_list_members_user_idx" ON "public"."lead_list_members" ("user_id");

CREATE TABLE "public"."crm_column_prefs" (
  "user_id" uuid PRIMARY KEY REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "visible_columns" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "column_order" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
