// Dicteren.ai — Support-snapshot van één klant (staff-only, on-demand).
//
// Voedt de Commercie-tab van het CRM side-panel met dezelfde data als de
// support-cockpit (licenties + apparaten, orders, abonnementen, mails, org-
// memberships). Wordt PAS aangeroepen als de AM die tab opent — niet in de
// lijst-query, niet bij panel-open.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { getCustomerSupportSnapshot } from "@/lib/services/adminSupport";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;

  const snapshot = await getCustomerSupportSnapshot(id);
  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: "Klant niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, snapshot });
}
