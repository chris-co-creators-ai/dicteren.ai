// Dicteren.ai — Admin: promote een persoon naar een actieve reseller (affiliate).
// De grens /crm → /affiliates: hier ontstaat de affiliate-record + de brug
// (crm_contacts.promoted_affiliate_id). De AM rondt de showcase-pagina (slug,
// logo, quote) daarna af in /admin/affiliates. Guards zitten in de service.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaffApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { crmContacts } from "@/lib/db/schema";
import { promoteContactToReseller } from "@/lib/services/partnerFunnel";
import { sendPartnerWelcomeEmail } from "@/lib/services/email";

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

  // Welkomstmail naar de nieuwe reseller, vanuit het AM-adres (await, nooit
  // fire-and-forget op Vercel). Een mislukte mail laat de promote staan.
  const [contact] = await db
    .select({ email: crmContacts.email, firstName: crmContacts.firstName })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (contact?.email && session.user.email) {
    await sendPartnerWelcomeEmail({
      to: contact.email,
      contactName: contact.firstName ?? null,
      amName: session.user.name || "Dicteren.ai",
      amEmail: session.user.email,
      contactId,
    });
  }

  return NextResponse.json({
    success: true,
    data: { affiliateId: result.affiliate.id },
  });
}
