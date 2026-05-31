-- 0024 — Campagne-stappen per leadlijst + interactie-logging
--
-- Interactie-logging hergebruikt het bestaande crm_events: een nieuw kind
-- 'interaction_logged' met de gestructureerde gegevens in payload. De
-- campagne-builder is een nieuwe template-tabel; "Toepassen" maakt crm_org_tasks
-- (het bestaande taken-systeem), geen aparte activity-tabel.
--
-- LET OP bij toepassen: voer de ALTER TYPE ... ADD VALUE als losse statement uit
-- (niet in dezelfde transactie als gebruik ervan).

-- Nieuw event-kind voor handmatig gelogde interacties.
ALTER TYPE public.crm_event_kind ADD VALUE IF NOT EXISTS 'interaction_logged';

-- Staptype-enum voor de campagne-builder (spiegelt ActivityType uit de SSOT).
DO $$ BEGIN
  CREATE TYPE public.crm_step_type AS ENUM (
    'call', 'email', 'linkedin', 'meeting', 'note'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.crm_campaign_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL
    REFERENCES public.lead_lists(id) ON DELETE CASCADE,
  position integer NOT NULL,
  type public.crm_step_type NOT NULL,
  delay_days integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_campaign_steps_list_position_idx
  ON public.crm_campaign_steps (list_id, position);
