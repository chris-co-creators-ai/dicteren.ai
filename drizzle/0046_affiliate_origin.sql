-- 0046_affiliate_origin.sql
-- PRD self-serve-referral, Fase 1: herkomst-kolom op affiliates (additief).
-- self_serve = publieke voordeur, am = admin handmatig, reseller_funnel = CRM-promote.
-- Default 'am' → alle bestaande rijen (pre-self-serve) + admin-create vallen op 'am';
-- de self-serve-flow zet expliciet 'self_serve'. Nullable-vrij via default, breekt niks.

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'am';
