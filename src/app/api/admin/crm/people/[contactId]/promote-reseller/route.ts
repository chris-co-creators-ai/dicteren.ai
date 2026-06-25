// Dicteren.ai — Admin: promote een persoon naar een actieve reseller (affiliate).
// De grens /crm → /affiliates: hier ontstaat de affiliate-record + de brug
// (crm_contacts.promoted_affiliate_id). De welkomstmail (account-login + magic-link +
// landingspagina + code) gaat via de gedeelde sendPartnerWelcome-helper, die ook de
// "opnieuw sturen"-knop gebruikt.

import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { requireStaffApi } from "@/lib/auth/session";
import { promoteContactToReseller } from "@/lib/services/partnerFunnel";
import { sendPartnerWelcome } from "@/lib/services/partnerWelcome";

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
  console.log(`[promote-reseller ${contactId}] promote ok`, {
    affiliateId: result.affiliate.id,
    slug: result.affiliate.slug,
    code: result.affiliate.code,
    discountCode: result.discountCode,
  });

  // Welkomstmail (laat de promote staan bij een mislukte mail). amEmail = de AM.
  if (session.user.email) {
    await sendPartnerWelcome({
      contactId,
      amName: session.user.name || "Dicteren.ai",
      amEmail: session.user.email,
      headers: await nextHeaders(),
    });
  }

  return NextResponse.json({
    success: true,
    data: { affiliateId: result.affiliate.id },
  });
}
