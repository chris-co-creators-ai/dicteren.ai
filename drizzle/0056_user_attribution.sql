-- Koppelt een klant aan de campagne waarmee hij binnenkwam.
--
-- De capture bestaat al: SourceCapture (migratie-loos, commit 4bf4b90) zet
-- gclid en utm_* in de cookie dai_attrib zodra de bezoeker marketing-consent
-- geeft. Wat ontbrak was de brug naar een gebruiker, zodat /admin/users kan
-- tonen dat iemand via een advertentie kwam. Dat is deze tabel.
--
-- Eén rij per user. De cookie is last-click (zoals Google Ads attribueert);
-- deze tabel legt vast wat er in die cookie stond op het moment dat de
-- gebruiker zijn trial claimde. Daarna verandert hij niet meer: de insert is
-- ON CONFLICT DO NOTHING.
--
-- gclid staat apart omdat dat de sleutel is waarmee we betaalde orders later
-- als offline conversie terug naar Google Ads kunnen sturen.

CREATE TABLE IF NOT EXISTS "public"."user_attribution" (
  "user_id"      uuid PRIMARY KEY NOT NULL
                 REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "utm_source"   text,
  "utm_medium"   text,
  "utm_campaign" text,
  "utm_term"     text,
  "utm_content"  text,
  "gclid"        text,
  "landing_path" text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_attribution_source_idx"
  ON "public"."user_attribution" ("utm_source");

CREATE INDEX IF NOT EXISTS "user_attribution_campaign_idx"
  ON "public"."user_attribution" ("utm_campaign");

CREATE INDEX IF NOT EXISTS "user_attribution_gclid_idx"
  ON "public"."user_attribution" ("gclid");
