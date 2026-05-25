-- 0006 — Better Auth self-host schema + data-migratie
--
-- Doel: weg van Neon Auth managed, naar eigen Better Auth instance met
-- volledige email-controle via Resend.
--
-- Schema-aanpak:
--   - nieuw schema "auth" (eigen, ipv neon_auth)
--   - alle Better Auth tabellen erin (user/account/session/verification/
--     organization/member/invitation/jwks)
--   - data 1:1 kopieren uit neon_auth.* (user-IDs behouden zodat FKs in
--     public.licenses/orders/etc blijven kloppen)
--   - oude FKs in public.* die naar neon_auth.user wijzen, opnieuw richten
--     naar auth.user
--
-- LET OP: sessions worden NIET gemigreerd. Better Auth's session-cookie
-- naam wijkt af van Neon Auth's; bestaande cookies werken sowieso niet
-- meer. Iedereen moet 1× opnieuw inloggen. Wachtwoorden BLIJVEN werken
-- (zelfde scrypt-hash format).

-- ───── 1. Schema + tabellen ─────────────────────────────────

CREATE SCHEMA IF NOT EXISTS "auth";

CREATE TABLE IF NOT EXISTS "auth"."user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "role" text,
  "banned" boolean DEFAULT false,
  "banReason" text,
  "banExpires" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_email_unique" ON "auth"."user" ("email");

CREATE TABLE IF NOT EXISTS "auth"."account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" uuid NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "auth_account_user_idx" ON "auth"."account" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_account_provider_unique"
  ON "auth"."account" ("providerId", "accountId");

CREATE TABLE IF NOT EXISTS "auth"."session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "impersonatedBy" uuid,
  "activeOrganizationId" uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_session_token_unique" ON "auth"."session" ("token");
CREATE INDEX IF NOT EXISTS "auth_session_user_idx" ON "auth"."session" ("userId");

CREATE TABLE IF NOT EXISTS "auth"."verification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "auth_verification_identifier_idx" ON "auth"."verification" ("identifier");

CREATE TABLE IF NOT EXISTS "auth"."organization" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text,
  "logo" text,
  "metadata" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "auth"."member" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "auth"."organization"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "auth_member_org_idx" ON "auth"."member" ("organizationId");
CREATE INDEX IF NOT EXISTS "auth_member_user_idx" ON "auth"."member" ("userId");

CREATE TABLE IF NOT EXISTS "auth"."invitation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "auth"."organization"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text,
  "status" text NOT NULL,
  "inviterId" uuid NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "auth_invitation_org_idx" ON "auth"."invitation" ("organizationId");

CREATE TABLE IF NOT EXISTS "auth"."jwks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "publicKey" text NOT NULL,
  "privateKey" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- ───── 2. Data-migratie uit neon_auth.* ─────────────────────
-- Idempotent: ON CONFLICT DO NOTHING. Veilig om opnieuw te draaien.

INSERT INTO "auth"."user"
  ("id", "name", "email", "emailVerified", "image",
   "createdAt", "updatedAt", "role", "banned", "banReason", "banExpires")
SELECT
  "id", "name", "email", "emailVerified", "image",
  "createdAt", "updatedAt", "role", "banned", "banReason", "banExpires"
FROM "neon_auth"."user"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "auth"."account"
  ("id", "accountId", "providerId", "userId",
   "accessToken", "refreshToken", "idToken",
   "accessTokenExpiresAt", "refreshTokenExpiresAt",
   "scope", "password", "createdAt", "updatedAt")
SELECT
  "id", "accountId", "providerId", "userId",
  "accessToken", "refreshToken", "idToken",
  "accessTokenExpiresAt", "refreshTokenExpiresAt",
  "scope", "password", "createdAt", "updatedAt"
FROM "neon_auth"."account"
ON CONFLICT ("id") DO NOTHING;

-- verification: kopieer alleen niet-verlopen rows
INSERT INTO "auth"."verification"
  ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
SELECT "id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"
FROM "neon_auth"."verification"
WHERE "expiresAt" > now()
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "auth"."organization"
  ("id", "name", "slug", "logo", "metadata", "createdAt")
SELECT "id", "name", "slug", "logo", "metadata", "createdAt"
FROM "neon_auth"."organization"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "auth"."member"
  ("id", "organizationId", "userId", "role", "createdAt")
SELECT "id", "organizationId", "userId", "role", "createdAt"
FROM "neon_auth"."member"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "auth"."invitation"
  ("id", "organizationId", "email", "role", "status",
   "inviterId", "expiresAt", "createdAt")
SELECT "id", "organizationId", "email", "role", "status",
  "inviterId", "expiresAt", "createdAt"
FROM "neon_auth"."invitation"
ON CONFLICT ("id") DO NOTHING;

-- Sessions kopieren we NIET — cookie-format wijkt af, oude sessies blijven
-- toch ongeldig na cutover.

-- ───── 3. FK-target wissel in public.* ──────────────────────
-- Alle tabellen die naar neon_auth.user / neon_auth.organization wezen,
-- moeten nu naar auth.user / auth.organization.

ALTER TABLE "public"."user_billing"
  DROP CONSTRAINT IF EXISTS "user_billing_user_id_user_id_fk",
  ADD CONSTRAINT "user_billing_user_id_auth_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;

ALTER TABLE "public"."organization_billing"
  DROP CONSTRAINT IF EXISTS "organization_billing_organization_id_organization_id_fk",
  ADD CONSTRAINT "organization_billing_organization_id_auth_org_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE CASCADE;

ALTER TABLE "public"."subscriptions"
  DROP CONSTRAINT IF EXISTS "subscriptions_user_id_user_id_fk",
  ADD CONSTRAINT "subscriptions_user_id_auth_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;

ALTER TABLE "public"."subscriptions"
  DROP CONSTRAINT IF EXISTS "subscriptions_organization_id_organization_id_fk",
  ADD CONSTRAINT "subscriptions_organization_id_auth_org_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE SET NULL;

ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_user_id_user_id_fk",
  ADD CONSTRAINT "orders_user_id_auth_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;

ALTER TABLE "public"."orders"
  DROP CONSTRAINT IF EXISTS "orders_organization_id_organization_id_fk",
  ADD CONSTRAINT "orders_organization_id_auth_org_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE SET NULL;

ALTER TABLE "public"."licenses"
  DROP CONSTRAINT IF EXISTS "licenses_user_id_user_id_fk",
  ADD CONSTRAINT "licenses_user_id_auth_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;

ALTER TABLE "public"."licenses"
  DROP CONSTRAINT IF EXISTS "licenses_organization_id_organization_id_fk",
  ADD CONSTRAINT "licenses_organization_id_auth_org_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE SET NULL;

ALTER TABLE "public"."license_activations"
  DROP CONSTRAINT IF EXISTS "license_activations_user_id_user_id_fk",
  ADD CONSTRAINT "license_activations_user_id_auth_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;

ALTER TABLE "public"."email_logs"
  DROP CONSTRAINT IF EXISTS "email_logs_user_id_user_id_fk",
  ADD CONSTRAINT "email_logs_user_id_auth_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events"
  DROP CONSTRAINT IF EXISTS "events_user_id_user_id_fk",
  ADD CONSTRAINT "events_user_id_auth_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events"
  DROP CONSTRAINT IF EXISTS "events_organization_id_organization_id_fk",
  ADD CONSTRAINT "events_organization_id_auth_org_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE SET NULL;
