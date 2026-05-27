-- 0016 — AM-team foundation
--
-- Schema-laag voor het AM-team plan (zie .claude/docs/team.md):
--   1. auth.user.assistant_name — koppelt AI-naam (Kai/Vegeta/Goku/Popo) aan human
--   2. staff_action_permissions — granular per-actie rechten per user (Laag B in PRD)
--   3. fuzzystrmatch extensie — voor Levenshtein-fuzzy matching in dedup-zoekfunctie
--   4. crm_organizations.kvk unique-index — hard slot tegen duplicate-KvK

ALTER TABLE "auth"."user"
  ADD COLUMN IF NOT EXISTS "assistant_name" text;

CREATE TABLE IF NOT EXISTS "public"."staff_action_permissions" (
  "user_id"     uuid PRIMARY KEY REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "permissions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_by"  uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

CREATE UNIQUE INDEX IF NOT EXISTS "crm_organizations_kvk_unique"
  ON "public"."crm_organizations" ("kvk")
  WHERE "kvk" IS NOT NULL;
