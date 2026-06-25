// Dicteren.ai — Admin: promote een persoon naar een actieve reseller (affiliate).
// De grens /crm → /affiliates: hier ontstaat de affiliate-record + de brug
// (crm_contacts.promoted_affiliate_id). Bij publiceren maken we ook een partner-
// login aan (gekoppeld aan de affiliate) en sturen we de welkomstmail met de
// landingspagina-URL, de eigen kortingscode, het portaal en een set-password-link.

import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { eq } from "drizzle-orm";
import { requireStaffApi } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";
import { takeCapturedMagicLink } from "@/lib/auth/magicLinkCapture";
import { db } from "@/lib/db";
import { crmContacts, affiliates } from "@/lib/db/schema";
import { promoteContactToReseller } from "@/lib/services/partnerFunnel";
import { ensurePartnerAuthAccount } from "@/lib/services/partnerAccount";
import { sendPartnerWelcomeEmail } from "@/lib/services/email";
import { affiliatePublicUrl, emailBase } from "@/lib/url";

type Params = Promise<{ contactId: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { contactId } = await params;

  const result = await promoteContactToReseller(contactId, session.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 422 },
    );
  }

  const [contact] = await db
    .select({
      email: crmContacts.email,
      firstName: crmContacts.firstName,
      name: crmContacts.name,
      companyName: crmContacts.companyName,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);

  // Login + koppeling + welkomstmail. Elke stap gelogd (zichtbaar in de Vercel
  // runtime-logs), zodat we precies zien waar het misgaat. Een mislukte stap laat
  // de promote staan; de mail wordt altijd geprobeerd.
  const log = (msg: string, extra?: unknown) =>
    console.log(`[promote-reseller ${contactId}] ${msg}`, extra ?? "");
  log("promote ok", {
    affiliateId: result.affiliate.id,
    slug: result.affiliate.slug,
    code: result.affiliate.code,
    discountCode: result.discountCode,
  });

  if (contact?.email && session.user.email) {
    const partnerName =
      contact.companyName?.trim() || contact.name || "Partner";
    const base = emailBase();

    // Account aanmaken/koppelen (gevangen: een throw hier mag de promote + mail niet
    // omver halen).
    let account: { userId: string; created: boolean } | null = null;
    try {
      account = await ensurePartnerAuthAccount(contact.email, partnerName);
      log(
        account
          ? `account ${account.created ? "aangemaakt" : "bestond al"}: ${account.userId}`
          : "account null (ongeldig e-mailadres)",
      );
    } catch (e) {
      log("account-stap FAALDE", e instanceof Error ? e.message : e);
    }

    let loginUrl: string | null = null;
    if (account) {
      try {
        await db
          .update(affiliates)
          .set({ userId: account.userId, updatedAt: new Date() })
          .where(eq(affiliates.id, result.affiliate.id));
        log("affiliate gekoppeld aan login");
      } catch (e) {
        log("koppeling overgeslagen (al gekoppeld?)", e instanceof Error ? e.message : e);
      }
      // Eén-klik magic-link naar het portaal (URL via de capture-callback).
      try {
        await auth.api.signInMagicLink({
          headers: await nextHeaders(),
          body: { email: contact.email, callbackURL: `${base}/affiliate/dashboard` },
        });
        loginUrl = takeCapturedMagicLink();
        log(loginUrl ? "magic-link gegenereerd" : "magic-link LEEG (capture miste)");
      } catch (e) {
        log("magic-link FAALDE", e instanceof Error ? e.message : e);
      }
    }

    const sent = await sendPartnerWelcomeEmail({
      to: contact.email,
      contactName: contact.firstName ?? null,
      amName: session.user.name || "Dicteren.ai",
      amEmail: session.user.email,
      contactId,
      landingUrl: affiliatePublicUrl(result.affiliate, base),
      discountCode: result.discountCode,
      portalUrl: `${base}/affiliate/dashboard`,
      loginUrl,
    });
    log(sent.success ? "welkomstmail verstuurd" : `welkomstmail FAALDE: ${sent.error}`);
  } else {
    log("geen mail: contact-email of AM-email ontbreekt");
  }

  return NextResponse.json({
    success: true,
    data: { affiliateId: result.affiliate.id },
  });
}
