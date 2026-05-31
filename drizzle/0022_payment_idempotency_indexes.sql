-- 0022 — Idempotentie-indexes voor payments + affiliate-commissie
--
-- (1) payments.mollie_payment_id uniek: de webhook + renewSubscriptionLicense
--     gebruiken ON CONFLICT op deze kolom om dubbele payment-rijen (en daarmee
--     dubbele renewal-mails/omzet) te voorkomen. Zonder unique faalt ON CONFLICT.
-- (2) affiliate_commissions (order_id, payment_id) uniek waar payment_id gezet
--     is: tweede vangnet tegen dubbele renewal-commissie bij webhook-retry,
--     onafhankelijk van de niet-atomaire sequence_number-telling.

-- Volledige unique (geen partial): Drizzle's onConflictDoNothing genereert een
-- bare ON CONFLICT (mollie_payment_id) die niet matcht met een partial index.
-- Postgres behandelt NULLs als distinct, dus meerdere NULL-rijen blijven toegestaan.
CREATE UNIQUE INDEX IF NOT EXISTS payments_mollie_payment_id_unique
  ON public.payments (mollie_payment_id);

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_commissions_order_payment_unique
  ON public.affiliate_commissions (order_id, payment_id)
  WHERE payment_id IS NOT NULL;
