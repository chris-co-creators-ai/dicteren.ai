-- Migration 0018 — Prospect-flow naar crm_contacts + email-format-constraint.
--
-- Background: tot 2026-05-28 schreef /api/admin/prospects rijen direct in
-- auth.user (zonder login-functie, zonder email-validatie). Resultaat:
-- één ghost-rij "marijke visschedijk" met email zonder @ en role NULL.
--
-- Deze migratie:
--   1. Maakt placeholder-org "Onbekende organisatie" in crm_organizations.
--   2. Verhuist alle ghost-auth.user-rijen (role IS NULL OR email NOT LIKE '%@%')
--      naar crm_contacts onder die placeholder-org.
--   3. Verwijdert hun customer_attributes + auth.user-rijen.
--   4. Voegt CHECK-constraint toe op auth.user.email zodat dit nooit meer kan.

-- Stap 1 — Placeholder-org find-or-create.
INSERT INTO crm_organizations (name, source, status)
SELECT 'Onbekende organisatie', 'lead_form', 'lead'
WHERE NOT EXISTS (
  SELECT 1 FROM crm_organizations WHERE name = 'Onbekende organisatie'
);

-- Stap 2 — Verhuis ghost-rijen naar crm_contacts.
WITH placeholder AS (
  SELECT id FROM crm_organizations WHERE name = 'Onbekende organisatie' LIMIT 1
),
ghosts AS (
  SELECT id, name, email, "createdAt"
  FROM auth."user"
  WHERE email NOT LIKE '%@%'
     OR (role IS NULL AND id NOT IN (SELECT user_id FROM "session"))
)
INSERT INTO crm_contacts (
  crm_organization_id, name, email, notes, created_at, updated_at
)
SELECT
  (SELECT id FROM placeholder),
  g.name,
  CASE
    WHEN g.email LIKE '%@%' THEN lower(trim(g.email))
    ELSE lower(replace(trim(g.email), ' ', '.')) || '@onbekend.local'
  END,
  CASE
    WHEN g.email NOT LIKE '%@%'
      THEN 'Imported from broken signup-flow. Original email-field: ' || g.email
    ELSE NULL
  END,
  g."createdAt",
  now()
FROM ghosts g
ON CONFLICT DO NOTHING;

-- Stap 3 — Cleanup auth.user-zijde.
DELETE FROM customer_attributes
WHERE user_id IN (
  SELECT id FROM auth."user"
  WHERE email NOT LIKE '%@%'
     OR (role IS NULL AND id NOT IN (SELECT user_id FROM "session"))
);

DELETE FROM auth."user"
WHERE email NOT LIKE '%@%'
   OR (role IS NULL AND id NOT IN (SELECT user_id FROM "session"));

-- Stap 4 — Email-format-constraint. Voorkomt dat dit ooit weer kan.
ALTER TABLE auth."user"
  ADD CONSTRAINT auth_user_email_format
  CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
