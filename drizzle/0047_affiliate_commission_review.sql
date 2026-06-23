-- 0047_affiliate_commission_review.sql
-- PRD self-serve-referral, Fase 3.4: self-referral flag-and-review (additief).
-- Een commissie waarvan de koper op hetzelfde bedrijfsdomein zit als de affiliate
-- wordt gemarkeerd (needs_review=true) en blijft 'pending' i.p.v. payable te worden,
-- tot een AM 'm goedkeurt of void't. Geen harde blokkade. Bestaande same-account-
-- self-referral wordt al upstream geblokkeerd (attributeUserToAffiliate).

ALTER TABLE affiliate_commissions
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason text;
