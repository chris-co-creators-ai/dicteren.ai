// Dicteren.ai — Better Auth (self-hosted) schema
//
// Aparte file zodat schema.ts niet ontploft. Better Auth's drizzle-adapter
// verwacht specifieke tabel- en kolom-namen. Wijken we daarvan af → adapter
// faalt silent (lookup-query matched niet).
//
// Schema-namespace: "auth" (eigen postgres-schema), parallel aan "neon_auth"
// (legacy, Neon-managed). Na migratie kunnen we neon_auth wegsnijden.
//
// User-IDs blijven gelijk aan neon_auth.user.id → alle FKs in public.* die nu
// naar neon_auth.user.id wijzen, blijven kloppen na we de FK-target wisselen.

import {
  pgSchema,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const authNs = pgSchema("auth");

// ───── user ─────────────────────────────────────────────────
// Better Auth + admin-plugin velden.

export const authUser = authNs.table(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** Normalized variant — strips Gmail dots, plus-aliassen op alle providers,
     *  lowercase. Unique zodat jan@gmail.com en j.a.n+x@gmail.com niet allebei
     *  een account kunnen krijgen. Gevuld door normalizeEmail() in service-laag. */
    emailNormalized: text("email_normalized").notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // admin plugin
    role: text("role"),
    banned: boolean("banned").default(false),
    banReason: text("banReason"),
    banExpires: timestamp("banExpires", { withTimezone: true }),
    // AM-team plan: koppel AI-naam aan human (Kai/Vegeta/Goku/Popo)
    assistantName: text("assistant_name"),
  },
  (t) => [
    uniqueIndex("auth_user_email_unique").on(t.email),
    uniqueIndex("auth_user_email_normalized_unique").on(t.emailNormalized),
  ],
);

// ───── account ──────────────────────────────────────────────
// Eén rij per provider per user (credential, google, github, ...).

export const authAccount = authNs.table(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("auth_account_user_idx").on(t.userId),
    uniqueIndex("auth_account_provider_unique").on(t.providerId, t.accountId),
  ],
);

// ───── session ──────────────────────────────────────────────

export const authSession = authNs.table(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: uuid("userId")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    // admin plugin: impersonation
    impersonatedBy: uuid("impersonatedBy"),
    // organization plugin: active org context
    activeOrganizationId: uuid("activeOrganizationId"),
  },
  (t) => [
    uniqueIndex("auth_session_token_unique").on(t.token),
    index("auth_session_user_idx").on(t.userId),
  ],
);

// ───── verification ─────────────────────────────────────────
// Better Auth gebruikt deze voor email-verificatie, password-reset,
// email-OTP, change-email, change-password verificatie, ...

export const authVerification = authNs.table(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("auth_verification_identifier_idx").on(t.identifier)],
);

// ───── organization plugin ──────────────────────────────────

export const authOrg = authNs.table("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug"),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authMember = authNs.table(
  "member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => authOrg.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("auth_member_org_idx").on(t.organizationId),
    index("auth_member_user_idx").on(t.userId),
  ],
);

export const authInvitation = authNs.table(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organizationId")
      .notNull()
      .references(() => authOrg.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull(),
    inviterId: uuid("inviterId")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("auth_invitation_org_idx").on(t.organizationId)],
);

// ───── jwks (Better Auth jwks plugin, gebruikt voor desktop-token) ─

export const authJwks = authNs.table("jwks", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ───── mcp / oidc-provider plugin ───────────────────────────
// Better Auth's mcp-plugin maakt onze instance een OAuth 2.1-provider voor
// MCP-clients (Hermes Agent "Pi", de Claude MCP-connector, ...). Drie tabellen,
// kolomnamen camelCase conform de drizzle-adapter (net als account/session).
// clientId is de FK-target (geen id) voor token + consent. Dynamic client
// registration vult oauth_application automatisch bij de eerste agent-koppeling.

export const authOAuthApplication = authNs.table(
  "oauth_application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    icon: text("icon"),
    metadata: text("metadata"),
    clientId: text("clientId").notNull(),
    clientSecret: text("clientSecret"),
    redirectUrls: text("redirectURLs"),
    type: text("type"),
    disabled: boolean("disabled").default(false),
    userId: uuid("userId").references(() => authUser.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("auth_oauth_application_client_id_unique").on(t.clientId),
    index("auth_oauth_application_user_idx").on(t.userId),
  ],
);

export const authOAuthAccessToken = authNs.table(
  "oauth_access_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    clientId: text("clientId").references(() => authOAuthApplication.clientId, {
      onDelete: "cascade",
    }),
    userId: uuid("userId").references(() => authUser.id, {
      onDelete: "cascade",
    }),
    scopes: text("scopes"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("auth_oauth_access_token_unique").on(t.accessToken),
    uniqueIndex("auth_oauth_refresh_token_unique").on(t.refreshToken),
    index("auth_oauth_access_token_client_idx").on(t.clientId),
    index("auth_oauth_access_token_user_idx").on(t.userId),
  ],
);

export const authOAuthConsent = authNs.table(
  "oauth_consent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: text("clientId").references(() => authOAuthApplication.clientId, {
      onDelete: "cascade",
    }),
    userId: uuid("userId").references(() => authUser.id, {
      onDelete: "cascade",
    }),
    scopes: text("scopes"),
    consentGiven: boolean("consentGiven"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("auth_oauth_consent_client_idx").on(t.clientId),
    index("auth_oauth_consent_user_idx").on(t.userId),
  ],
);

// ───── Inferred types ───────────────────────────────────────

export type AuthUser = typeof authUser.$inferSelect;
export type AuthAccount = typeof authAccount.$inferSelect;
export type AuthSession = typeof authSession.$inferSelect;
export type AuthVerification = typeof authVerification.$inferSelect;
export type AuthOrg = typeof authOrg.$inferSelect;
export type AuthMember = typeof authMember.$inferSelect;
export type AuthInvitation = typeof authInvitation.$inferSelect;
export type AuthOAuthApplication = typeof authOAuthApplication.$inferSelect;
export type AuthOAuthAccessToken = typeof authOAuthAccessToken.$inferSelect;
export type AuthOAuthConsent = typeof authOAuthConsent.$inferSelect;
