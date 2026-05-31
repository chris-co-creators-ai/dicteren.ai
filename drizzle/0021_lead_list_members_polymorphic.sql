-- 0021 — Polymorfe lead_list_members
--
-- Een lijst-member is óf een auth.user (klant) óf een crm_contact
-- (GTM-prospect zonder login). Precies één van de twee is gevuld. Hiermee
-- kunnen leadlijsten prospects bevatten — dat was onmogelijk toen members
-- alleen naar auth.user.id konden wijzen.

-- De composite PK (list_id, user_id) blokkeert een nullable user_id.
-- Uniqueness wordt overgenomen door de partial unique indexes hieronder.
ALTER TABLE public.lead_list_members
  DROP CONSTRAINT IF EXISTS lead_list_members_pkey;

-- user_id mag nu leeg zijn (dan is crm_contact_id gevuld).
ALTER TABLE public.lead_list_members
  ALTER COLUMN user_id DROP NOT NULL;

-- Nieuwe polymorfe tak naar crm_contacts.
ALTER TABLE public.lead_list_members
  ADD COLUMN IF NOT EXISTS crm_contact_id uuid
    REFERENCES public.crm_contacts(id) ON DELETE CASCADE;

-- Precies één van beide gevuld (XOR).
ALTER TABLE public.lead_list_members
  DROP CONSTRAINT IF EXISTS lead_list_members_exactly_one;
ALTER TABLE public.lead_list_members
  ADD CONSTRAINT lead_list_members_exactly_one
  CHECK ((user_id IS NOT NULL) <> (crm_contact_id IS NOT NULL));

-- Oude full-row unique index vervangen door partial unique per type.
DROP INDEX IF EXISTS public.lead_list_members_pk_unique;

CREATE UNIQUE INDEX IF NOT EXISTS lead_list_members_user_unique
  ON public.lead_list_members (list_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lead_list_members_contact_unique
  ON public.lead_list_members (list_id, crm_contact_id)
  WHERE crm_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lead_list_members_contact_idx
  ON public.lead_list_members (crm_contact_id);
