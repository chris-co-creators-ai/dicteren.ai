-- 0035 — Bijlagen bij Kanban-taken (screenshots/afbeeldingen)
--
-- De file staat in R2 (bucket dicteren-content, prefix tasks/); deze tabel is
-- de index/metadata. Puur additief; raakt geen bestaande tabellen.

CREATE TABLE IF NOT EXISTS public.kanban_task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  r2_key text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  width integer,
  height integer,
  uploaded_by_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kanban_task_attachments_task_idx ON public.kanban_task_attachments (task_id);
