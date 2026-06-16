-- Reseller-funnel: e-mailcategorie voor de partnerdeck-mail, zodat die mails
-- traceerbaar zijn in /admin/emails (net als de andere transactionele categorieën).

ALTER TYPE "public"."email_category" ADD VALUE IF NOT EXISTS 'partner_deck';
