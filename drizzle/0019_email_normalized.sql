-- Migration 0019 — email_normalized op auth.user voor anti-misbruik.
--
-- Dicht plus-trick (jan+x@gmail.com) en Gmail-dot-trick (j.a.n@gmail.com)
-- op DB-niveau via UNIQUE INDEX op email_normalized.
--
-- Backfill-logica (zelfde als lib/services/emailNormalize.ts):
--   1. lowercase + trim
--   2. strip alles na '+' in local-part (alle providers)
--   3. voor @gmail.com / @googlemail.com: strip dots in local-part +
--      normaliseer googlemail → gmail

-- Stap 1 — Kolom toevoegen (nullable voor backfill).
ALTER TABLE auth."user"
  ADD COLUMN IF NOT EXISTS email_normalized text;

-- Stap 2 — Backfill voor bestaande rijen.
UPDATE auth."user"
SET email_normalized =
  CASE
    WHEN split_part(lower(trim(email)), '@', 2) IN ('gmail.com', 'googlemail.com')
      THEN replace(
             split_part(split_part(lower(trim(email)), '@', 1), '+', 1),
             '.',
             ''
           ) || '@gmail.com'
    ELSE
      split_part(split_part(lower(trim(email)), '@', 1), '+', 1)
        || '@' || split_part(lower(trim(email)), '@', 2)
  END
WHERE email_normalized IS NULL;

-- Stap 3 — NOT NULL + UNIQUE.
ALTER TABLE auth."user"
  ALTER COLUMN email_normalized SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_normalized_unique
  ON auth."user" (email_normalized);
