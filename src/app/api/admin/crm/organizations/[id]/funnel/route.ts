// Dicteren.ai — Admin: reseller-funnel-state voor het CRM-org-side-panel.
// Geeft de afgeleide kolom + de contact-state, zodat de cockpit de
// progressie-tracker en de NU-zone kan tonen.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { getOrgFunnelState } from "@/lib/services/partnerFunnel";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const state = await getOrgFunnelState(id);
  return NextResponse.json({ success: true, data: state });
}
