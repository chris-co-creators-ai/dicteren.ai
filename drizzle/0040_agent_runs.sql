-- Dicteren.ai — migratie 0040: agent-observability (Pi's runs + stappen)
-- Additief. Twee tabellen + twee enums in public. Voedt de agent-console in /admin.

DO $$ BEGIN
  CREATE TYPE "agent_run_status" AS ENUM ('running', 'done', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "agent_step_status" AS ENUM ('ok', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agent_user_id"        uuid NOT NULL REFERENCES auth."user"("id") ON DELETE CASCADE,
  "requested_by_user_id" uuid REFERENCES auth."user"("id") ON DELETE SET NULL,
  "title"                text,
  "status"               "agent_run_status" NOT NULL DEFAULT 'running',
  "progress"             text,
  "summary"              text,
  "started_at"           timestamptz NOT NULL DEFAULT now(),
  "last_step_at"         timestamptz NOT NULL DEFAULT now(),
  "finished_at"          timestamptz
);

CREATE INDEX IF NOT EXISTS "agent_runs_agent_idx"     ON "agent_runs" ("agent_user_id");
CREATE INDEX IF NOT EXISTS "agent_runs_status_idx"    ON "agent_runs" ("status");
CREATE INDEX IF NOT EXISTS "agent_runs_last_step_idx" ON "agent_runs" ("last_step_at");

CREATE TABLE IF NOT EXISTS "agent_steps" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id"      uuid NOT NULL REFERENCES "agent_runs"("id") ON DELETE CASCADE,
  "seq"         integer NOT NULL,
  "tool"        text NOT NULL,
  "status"      "agent_step_status" NOT NULL DEFAULT 'ok',
  "input"       jsonb,
  "result"      jsonb,
  "summary"     text,
  "refs"        jsonb,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "agent_steps_run_idx"     ON "agent_steps" ("run_id");
CREATE INDEX IF NOT EXISTS "agent_steps_created_idx" ON "agent_steps" ("created_at");
