-- 0030 — Taken polymorf: org-taken (bestaand) + klant-taken (nieuw)
--
-- crm_org_tasks hing strikt aan een organisatie. Voor het klant-side-panel
-- moeten taken ook aan een auth.user kunnen hangen. crm_organization_id wordt
-- nullable; auth_user_id erbij. Een taak hangt aan een org OF een klant.
-- Veilig: bestaande rijen hebben org_id, queries breken niet door nullable.

ALTER TABLE public.crm_org_tasks
  ALTER COLUMN crm_organization_id DROP NOT NULL;

ALTER TABLE public.crm_org_tasks
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth."user"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS crm_org_tasks_user_idx ON public.crm_org_tasks (auth_user_id);
