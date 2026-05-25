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
  },
  (t) => [uniqueIndex("auth_user_email_unique").on(t.email)],
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

// ───── Inferred types ───────────────────────────────────────

export type AuthUser = typeof authUser.$inferSelect;
export type AuthAccount = typeof authAccount.$inferSelect;
export type AuthSession = typeof authSession.$inferSelect;
export type AuthVerification = typeof authVerification.$inferSelect;
export type AuthOrg = typeof authOrg.$inferSelect;
export type AuthMember = typeof authMember.$inferSelect;
export type AuthInvitation = typeof authInvitation.$inferSelect;
