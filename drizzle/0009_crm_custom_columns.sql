-- Dicteren.ai — Custom CRM-kolommen (door admin gedefinieerd).
-- Waardes worden opgeslagen in customer_attributes.custom_fields als JSON.

CREATE TABLE "public"."crm_custom_columns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "options" jsonb,
  "owner_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "is_shared" boolean NOT NULL DEFAULT true,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "crm_custom_columns_key_unique" ON "public"."crm_custom_columns" ("key");
