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
import { dbAuth } from "@/lib/db";
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
import {
  isDisposableEmail,
  normalizeEmail,
} from "@/lib/services/emailNormalize";
import { linkAffiliateToUserByEmail } from "@/lib/services/affiliate";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";

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
  // Belangrijk: onze schema heeft `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
  // Default genereert better-auth een nanoid (string) — dat rejecteert postgres
  // op een uuid-kolom (→ 500). `generateId: false` laat de DB de id genereren.
  advanced: {
    database: {
      generateId: false,
    },
  },
  database: drizzleAdapter(dbAuth, {
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
  // KRITIEK: onze auth.user-schema heeft een NOT NULL-kolom `email_normalized`
  // (anti-abuse) + nullable `assistant_name`. Better Auth schrijft bij create
  // ALLEEN gedeclareerde velden weg. Zonder deze declaratie gooit 'ie de in de
  // create-hook gezette `emailNormalized` weg → INSERT met `default` (=NULL) →
  // NOT NULL-violation → sign-up faalt (FAILED_TO_CREATE_USER). input:false =
  // client mag ze niet zetten; de waarde komt server-side uit de hook.
  user: {
    additionalFields: {
      emailNormalized: { type: "string", required: false, input: false },
      assistantName: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Anti-misbruik: Gmail-plus + dot-trick + wegwerp-domains blokkeren.
          const raw = (user.email as string | undefined) ?? "";
          if (isDisposableEmail(raw)) {
            throw new APIError("BAD_REQUEST", {
              message:
                "Dit lijkt een wegwerp-emailadres. Gebruik je werk- of persoonlijke email.",
            });
          }
          const normalized = normalizeEmail(raw);

          // Hard duplicate-check op normalized variant.
          const [existing] = await dbAuth
            .select({ id: authUser.id })
            .from(authUser)
            .where(eq(authUser.emailNormalized, normalized))
            .limit(1);
          if (existing) {
            throw new APIError("CONFLICT", {
              message:
                "Dit emailadres is al in gebruik. Log in of vraag een nieuw wachtwoord aan.",
            });
          }

          return {
            data: {
              ...user,
              emailNormalized: normalized,
            },
          };
        },
        after: async (user) => {
          // Reseller-onboarding: koppel een nieuwe user aan een bestaande
          // affiliate op e-mail. Dit is de enige brug login↔affiliate; zonder
          // deze koppeling ziet een reseller zijn /affiliate/dashboard nooit.
          try {
            await linkAffiliateToUserByEmail({
              userId: user.id,
              email: user.email as string,
            });
          } catch (e) {
            console.error("affiliate auto-link failed", e);
          }
        },
      },
    },
  },
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
    // sendOnSignUp: true zorgt dat elke nieuwe user direct een verify-mail
    // krijgt. requireEmailVerification blijft FALSE — gebruiker kan
    // gewoon de trial claimen / inloggen, de mail is een nudge zodat we
    // verified e-mails opbouwen tegen throwaway-spam (CRM-segmentatie).
    sendOnSignUp: true,
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
        // Lookup gekoppelde seat-code (per-seat model). Optioneel — bij invites
        // zonder pre-reserveer-seat blijft licenseCode undefined.
        let licenseCode: string | undefined;
        try {
          const { db } = await import("@/lib/db");
          const { licenses } = await import("@/lib/db/schema");
          const { eq } = await import("drizzle-orm");
          const [seat] = await db
            .select({ code: licenses.code })
            .from(licenses)
            .where(eq(licenses.invitationId, data.id))
            .limit(1);
          licenseCode = seat?.code;
        } catch (err) {
          console.warn("[org-invite] license-code lookup failed", err);
        }
        void sendOrganizationInviteEmail({
          to: data.email,
          inviterName: data.inviter.user.name ?? data.inviter.user.email,
          organizationName: data.organization.name,
          inviteUrl: acceptUrl,
          licenseCode,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
