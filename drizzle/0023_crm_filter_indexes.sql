-- 0023 — Indexen voor server-side CRM-filtering
--
-- Voorwaarde voor de gepagineerde, server-side gefilterde personen-lijst:
-- zonder deze worden de WHERE/GROUP BY op stage/assignee/temperature seq-scans
-- zodra er duizenden rijen zijn.

CREATE INDEX IF NOT EXISTS customer_attributes_stage_idx
  ON public.customer_attributes (stage);

CREATE INDEX IF NOT EXISTS customer_attributes_assigned_idx
  ON public.customer_attributes (assigned_to_user_id);

CREATE INDEX IF NOT EXISTS customer_attributes_temperature_idx
  ON public.customer_attributes (temperature);

-- Prospect-lijst leest crm_contacts WHERE auth_user_id IS NULL, gesorteerd op
-- created_at (keyset-cursor). Partial index matcht precies dat pad.
CREATE INDEX IF NOT EXISTS crm_contacts_prospect_created_idx
  ON public.crm_contacts (created_at DESC, id DESC)
  WHERE auth_user_id IS NULL;
