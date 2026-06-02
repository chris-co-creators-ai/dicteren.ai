-- 0028 — CRM-kolombreedtes per gebruiker (Excel/Clay-stijl resize)
--
-- Additief + nullable: bestaande prefs blijven werken, breedte valt terug op
-- de default tot de gebruiker een kolom versleept.

ALTER TABLE public.crm_column_prefs
  ADD COLUMN IF NOT EXISTS column_widths jsonb;
