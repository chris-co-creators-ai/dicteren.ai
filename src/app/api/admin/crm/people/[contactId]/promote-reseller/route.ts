// Dicteren.ai — Admin: promote een persoon naar een actieve reseller (affiliate).
// De grens /crm → /affiliates: hier ontstaat de affiliate-record + de brug
// (crm_contacts.promoted_affiliate_id). De AM rondt de showcase-pagina (slug,
// logo, quote) daarna af in /admin/affiliates. Guards zitten in de service.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { promoteContactToReseller } from "@/lib/services/partnerFunnel";

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
  return NextResponse.json({
    success: true,
    data: { affiliateId: result.affiliate.id },
  });
}
