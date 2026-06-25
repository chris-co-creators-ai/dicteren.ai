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
// sendEmailVerificationEmail, sendOrganizationInviteEmail). We AWAITEN ze,
// conform Resends officiele docs (send-with-vercel-functions): await
// resend.emails.send met {data,error}-afhandeling. Fire-and-forget (void)
// brak op Vercel: de functie bevriest na de response en de losgelaten fetch
// wordt afgebroken voor hij Resend bereikt (status failed, resend_id null,
// "Unable to fetch data. The request could not be resolved.").
// Trade-off: de response duurt iets langer als het account bestaat (milde
// account-existence timing-leak). Bewust geaccepteerd: betrouwbare aflevering
// weegt zwaarder dan dat marginale risico.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization, mcp, captcha, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { setCapturedMagicLink } from "./magicLinkCapture";
import { dbAuth } from "@/lib/db";
import { resolveSignupToCrm } from "@/lib/services/crmIdentityResolution";
import { attributeReferral } from "@/lib/services/referral";
import { getReferralCookie } from "@/lib/referralCookie";
import {
  authUser,
  authAccount,
  authSession,
  authVerification,
  authOrg,
  authMember,
  authInvitation,
  authJwks,
  authOAuthApplication,
  authOAuthAccessToken,
  authOAuthConsent,
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
      oauthApplication: authOAuthApplication,
      oauthAccessToken: authOAuthAccessToken,
      oauthConsent: authOAuthConsent,
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
      // Inbound/outbound-split: segment + consent uit de Persoonlijk/Zakelijk-toggle.
      // input:true want ze komen uit de signup-payload (client). DB-default vangt omissie.
      accountType: { type: "string", required: false, input: true },
      marketingConsent: { type: "boolean", required: false, input: true },
      // Naam-split + business-capture uit de signup-form. `name` blijft de composed
      // display-waarde (apart meegestuurd); deze velden zijn de schone losse data.
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      companyName: { type: "string", required: false, input: true },
      jobTitle: { type: "string", required: false, input: true },
      teamSize: { type: "string", required: false, input: true },
      // Vrienden uitnodigen: invite-code, server-set (lazy-gen), client mag 'm niet zetten.
      referralCode: { type: "string", required: false, input: false },
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
          // Inbound/outbound-split: koppel de signup aan een bestaande CRM-prospect
          // (e-mail/domein) + sein de AM. Niet-blokkerend — een match-fout mag de
          // signup nooit breken.
          try {
            await resolveSignupToCrm({
              userId: user.id,
              email: user.email as string,
              accountType:
                (user as { accountType?: string | null }).accountType ?? null,
            });
          } catch (e) {
            console.error("crm signup-resolution failed", e);
          }
          // Vrienden uitnodigen: koppel de signup aan een aanbrenger via de
          // referral-cookie + ken de aangebrachte z'n gratis maand toe. Non-blocking.
          try {
            const refCookie = await getReferralCookie();
            if (refCookie?.referrerUserId) {
              await attributeReferral({
                referrerUserId: refCookie.referrerUserId,
                referredUserId: user.id,
                referredEmail: user.email as string,
                referrerCode: refCookie.code,
                source: "link",
              });
            }
          } catch (e) {
            console.error("referral attribution failed", e);
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
      // Awaited (zie comment boven): de hook wacht tot Resend de mail
      // accepteert, zodat de fetch niet door de Vercel-functie-freeze
      // wordt afgekapt. Fouten landen in email_logs voor admin-debugging.
      await sendPasswordResetEmail({
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
      await sendEmailVerificationEmail({
        to: user.email,
        name: user.name ?? undefined,
        verifyUrl: url,
        userId: user.id,
      });
    },
  },
  plugins: [
    admin(),
    // Cloudflare Turnstile op ALLEEN de registratie. Bots hamerden /sign-up/email
    // (gibberish-namen, Tor + wegwerp-VPS, gratis trials geoogst). Per-IP-limiet
    // helpt niet tegen geroteerde IP's; een captcha-challenge breekt het script.
    // Bewust NIET op /sign-in/email: dat zou de programmatische login van Pi
    // (OAuth-flow + Hermes) breken. Sign-in is al rate-limited.
    //
    // Conditioneel: alleen actief als de secret-key gezet is. Zonder env breekt
    // er niets (geen captcha-eis); mét env én site-key in de frontend wordt elke
    // sign-up server-side tegen Turnstile's /siteverify gevalideerd.
    ...(process.env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: process.env.TURNSTILE_SECRET_KEY,
            endpoints: ["/sign-up/email"],
          }),
        ]
      : []),
    // MCP / OAuth 2.1-provider: agents (Hermes "Pi", Claude-connector) loggen in
    // met een bestaand Dicteren.ai-account en krijgen scoped access-tokens. DCR
    // staat aan zodat Hermes' `auth: oauth` zichzelf kan registreren zonder
    // handwerk. loginPage = onze bestaande Better Auth-sign-in.
    mcp({
      loginPage: "/auth/sign-in",
      oidcConfig: {
        loginPage: "/auth/sign-in",
        allowDynamicClientRegistration: true,
      },
    }),
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
        await sendOrganizationInviteEmail({
          to: data.email,
          inviterName: data.inviter.user.name ?? data.inviter.user.email,
          organizationName: data.organization.name,
          inviteUrl: acceptUrl,
          licenseCode,
        });
      },
    }),
    // Magic-link: alleen gebruikt voor de één-klik-login in de partner-welkomstmail.
    // We versturen 'm niet hier — de callback vangt de URL op (zie magicLinkCapture)
    // zodat de promote-route 'm in onze eigen rijke welkomstmail kan zetten.
    // disableSignUp: we maken het partner-account zelf aan (ensurePartnerAuthAccount).
    magicLink({
      disableSignUp: true,
      // 7 dagen geldig: de partner klikt de welkomstmail soms pas later open. De
      // default (5 min) zou de link dood maken. Lage-privilege partner-account.
      expiresIn: 60 * 60 * 24 * 7,
      sendMagicLink: async ({ url }) => {
        setCapturedMagicLink(url);
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
