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

  // Login + koppeling + welkomstmail (await, nooit fire-and-forget op Vercel). Een
  // mislukte mail of account-stap laat de promote staan.
  if (contact?.email && session.user.email) {
    const partnerName =
      contact.companyName?.trim() || contact.name || "Partner";

    const base = emailBase();

    // Account aanmaken/koppelen en aan de affiliate hangen (uniek; bij een al
    // gekoppelde user laten we de bestaande koppeling staan).
    const account = await ensurePartnerAuthAccount(contact.email, partnerName);
    let loginUrl: string | null = null;
    if (account) {
      try {
        await db
          .update(affiliates)
          .set({ userId: account.userId, updatedAt: new Date() })
          .where(eq(affiliates.id, result.affiliate.id));
      } catch {
        // unique-conflict: deze login hangt al aan een andere affiliate. Laat staan.
      }
      // Eén-klik magic-link naar het portaal. De plugin levert de URL via z'n
      // callback (magicLinkCapture); we lezen 'm hier terug en zetten 'm in de mail.
      try {
        await auth.api.signInMagicLink({
          headers: await nextHeaders(),
          body: {
            email: contact.email,
            callbackURL: `${base}/affiliate/dashboard`,
          },
        });
        loginUrl = takeCapturedMagicLink();
      } catch {
        loginUrl = null;
      }
    }

    await sendPartnerWelcomeEmail({
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
  }

  return NextResponse.json({
    success: true,
    data: { affiliateId: result.affiliate.id },
  });
}
