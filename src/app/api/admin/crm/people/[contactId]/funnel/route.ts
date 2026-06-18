// Dicteren.ai — Admin: reseller-funnel-state voor het persoon-side-panel.
// De funnel-velden leven op de contact zelf; geeft de afgeleide kolom + state
// zodat de cockpit de progressie-tracker en de NU-zone kan tonen.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { getContactFunnelState } from "@/lib/services/partnerFunnel";

type Params = Promise<{ contactId: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { contactId } = await params;
  const state = await getContactFunnelState(contactId);
  return NextResponse.json({ success: true, data: state });
}
