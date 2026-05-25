-- 0005 — license discount / source tracking
--
-- Discount + source moeten per license bekend zijn voor:
--   • CRM-segmentatie (consumer/team/partner + bron)
--   • Tauri-app abonnement-pagina (toon "3 maanden gratis tot DD-MM-YYYY")
--   • Audit (hoe is deze license uitgegeven: self-signup, partner-grant, admin)
--
-- Mollie metadata = bron-van-waarheid bij payment-creation, deze kolommen
-- kopieren we erbij in licenses zodat queries goedkoop zijn en de Mollie API
-- niet hoeft te worden geraadpleegd voor CRM-views.

ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "discount_type" text;
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "discount_value" integer;
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'self-signup';

CREATE INDEX IF NOT EXISTS "licenses_source_idx" ON "licenses" ("source");
