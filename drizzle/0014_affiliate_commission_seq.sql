-- 0014 — Affiliate commission idempotency op (order_id, sequence_number)
--
-- Voor renewals zijn er meerdere commissions per orderId (sequence_number
-- start bij 1 voor first-payment, 2 voor renewal-1, etc.). De oude
-- UNIQUE(order_id) blokkeerde dat.

ALTER TABLE "public"."affiliate_commissions"
  DROP CONSTRAINT IF EXISTS "affiliate_commissions_order_unique";

DROP INDEX IF EXISTS "public"."affiliate_commissions_order_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "affiliate_commissions_order_seq_unique"
  ON "public"."affiliate_commissions" ("order_id", "sequence_number");
