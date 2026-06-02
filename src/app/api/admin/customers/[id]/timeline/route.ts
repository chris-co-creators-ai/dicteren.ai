// Dicteren.ai — Verenigde klant-tijdlijn (account/trial/licentie/order/
// subscription/e-mail) voor het klant-side-panel. Staff-only.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { getCustomerTimeline } from "@/lib/services/customer-timeline";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;

  const entries = await getCustomerTimeline(id);
  return NextResponse.json({
    success: true,
    entries: entries.map((e) => ({
      id: e.id,
      at: e.at.toISOString(),
      kind: e.kind,
      title: e.title,
      detail: e.detail ?? null,
    })),
  });
}
