-- Dicteren.ai — migratie 0039: MCP / OAuth 2.1-provider tabellen (Better Auth mcp-plugin)
-- Additief. Drie tabellen in het auth.*-schema. Kolomnamen camelCase conform de
-- drizzle-adapter (net als auth.account / auth.session). clientId is de FK-target.

CREATE TABLE IF NOT EXISTS auth.oauth_application (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"          text,
  "icon"          text,
  "metadata"      text,
  "clientId"      text NOT NULL,
  "clientSecret"  text,
  "redirectURLs"  text,
  "type"          text,
  "disabled"      boolean DEFAULT false,
  "userId"        uuid REFERENCES auth."user"("id") ON DELETE CASCADE,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_oauth_application_client_id_unique"
  ON auth.oauth_application ("clientId");
CREATE INDEX IF NOT EXISTS "auth_oauth_application_user_idx"
  ON auth.oauth_application ("userId");

CREATE TABLE IF NOT EXISTS auth.oauth_access_token (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "accessToken"            text,
  "refreshToken"           text,
  "accessTokenExpiresAt"   timestamptz,
  "refreshTokenExpiresAt"  timestamptz,
  "clientId"               text REFERENCES auth.oauth_application("clientId") ON DELETE CASCADE,
  "userId"                 uuid REFERENCES auth."user"("id") ON DELETE CASCADE,
  "scopes"                 text,
  "createdAt"              timestamptz NOT NULL DEFAULT now(),
  "updatedAt"              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_oauth_access_token_unique"
  ON auth.oauth_access_token ("accessToken");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_oauth_refresh_token_unique"
  ON auth.oauth_access_token ("refreshToken");
CREATE INDEX IF NOT EXISTS "auth_oauth_access_token_client_idx"
  ON auth.oauth_access_token ("clientId");
CREATE INDEX IF NOT EXISTS "auth_oauth_access_token_user_idx"
  ON auth.oauth_access_token ("userId");

CREATE TABLE IF NOT EXISTS auth.oauth_consent (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId"      text REFERENCES auth.oauth_application("clientId") ON DELETE CASCADE,
  "userId"        uuid REFERENCES auth."user"("id") ON DELETE CASCADE,
  "scopes"        text,
  "consentGiven"  boolean,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "auth_oauth_consent_client_idx"
  ON auth.oauth_consent ("clientId");
CREATE INDEX IF NOT EXISTS "auth_oauth_consent_user_idx"
  ON auth.oauth_consent ("userId");
