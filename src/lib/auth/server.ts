// Dicteren.ai — Better Auth (self-hosted) server instance
//
// Vervangt @neondatabase/auth. Volledige controle over email-versturing
// (alles via Resend, NL Dicteren.ai-templates) en password-hashing.
//
// Schema in postgres "auth.*", drizzle-adapter koppelt eraan. User-IDs
// blijven gelijk aan de oude neon_auth.user.id zodat alle FKs in
// public.licenses/orders/etc. blijven kloppen na migratie.
//
// Email-callbacks: zie web/src/lib/services/email.ts (sendPasswordResetEmail,
// sendEmailVerificationEmail, sendOrganizationInviteEmail). We awaiten ze
// NIET in productie om timing-attack info te vermijden — Resend SDK is snel
// genoeg dat dit geen UX-issue is.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import {
  authUser,
  authAccount,
  authSession,
  authVerification,
  authOrg,
  authMember,
  authInvitation,
  authJwks,
} from "@/lib/db/auth-schema";
import {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendOrganizationInviteEmail,
} from "@/lib/services/email";

function appBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export const auth = betterAuth({
  baseURL: appBase(),
  // Hergebruik bestaande NEON_AUTH_COOKIE_SECRET (32+ bytes hex) zodat we
  // geen nieuwe secret hoeven uit te delen aan Vercel.
  secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      account: authAccount,
      session: authSession,
      verification: authVerification,
      organization: authOrg,
      member: authMember,
      invitation: authInvitation,
      jwks: authJwks,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // Fire-and-forget (zie comment boven). Resend faalt loud genoeg in
      // email_logs voor admin-debugging.
      void sendPasswordResetEmail({
        to: user.email,
        name: user.name ?? undefined,
        resetUrl: url,
        userId: user.id,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: false, // Voor nu: trial-flow vraagt geen verificatie. Aan zetten als we dat strenger willen.
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmailVerificationEmail({
        to: user.email,
        name: user.name ?? undefined,
        verifyUrl: url,
        userId: user.id,
      });
    },
  },
  plugins: [
    admin(),
    organization({
      sendInvitationEmail: async (data) => {
        const acceptUrl = `${appBase()}/auth/accept-invitation/${data.id}`;
        void sendOrganizationInviteEmail({
          to: data.email,
          inviterName: data.inviter.user.name ?? data.inviter.user.email,
          organizationName: data.organization.name,
          inviteUrl: acceptUrl,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
