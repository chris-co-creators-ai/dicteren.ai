-- 0033 — Interne Kanban-borden (team-taken)
--
-- Nieuwe, schone laag náást de entity-taken (partner_tasks / crm_org_tasks).
-- Borden -> kolommen (stages) -> taken (met assignee, subtaken via
-- parent_task_id, priority, due) -> comments (+ @mention-userIds in jsonb).
-- Puur additief: raakt geen bestaande tabellen. Zie .claude/prds/kanban-boards.

DO $$ BEGIN
  CREATE TYPE public.kanban_board_visibility AS ENUM ('shared', 'private');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.kanban_task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_user_id uuid NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  visibility public.kanban_board_visibility NOT NULL DEFAULT 'shared',
  color text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kanban_boards_owner_idx ON public.kanban_boards (owner_user_id);
CREATE INDEX IF NOT EXISTS kanban_boards_visibility_idx ON public.kanban_boards (visibility);

CREATE TABLE IF NOT EXISTS public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_done_column boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kanban_columns_board_idx ON public.kanban_columns (board_id);

CREATE TABLE IF NOT EXISTS public.kanban_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  column_id uuid REFERENCES public.kanban_columns(id) ON DELETE SET NULL,
  parent_task_id uuid,
  title text NOT NULL,
  description text,
  assignee_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  priority public.kanban_task_priority NOT NULL DEFAULT 'normal',
  due_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kanban_tasks_board_idx ON public.kanban_tasks (board_id);
CREATE INDEX IF NOT EXISTS kanban_tasks_column_idx ON public.kanban_tasks (column_id);
CREATE INDEX IF NOT EXISTS kanban_tasks_assignee_idx ON public.kanban_tasks (assignee_user_id);
CREATE INDEX IF NOT EXISTS kanban_tasks_parent_idx ON public.kanban_tasks (parent_task_id);

CREATE TABLE IF NOT EXISTS public.kanban_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  body text NOT NULL,
  mentions jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kanban_task_comments_task_idx ON public.kanban_task_comments (task_id);
