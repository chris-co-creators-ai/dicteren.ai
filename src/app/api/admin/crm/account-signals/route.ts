// Account-signalen voor de /crm side-panels (PRD crm-inbound-outbound-split, Fase 5).
// Read-only: welke login-accounts delen dit e-mailadres / e-maildomein, en onder
// welk segment. Voedt het "Account-signalen"-blok in de persoon- + org-panels.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { getAccountSignals } from "@/lib/services/crmIdentityResolution";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const domain = url.searchParams.get("domain");
  if (!email && !domain) {
    return NextResponse.json(
      { error: "email of domain vereist" },
      { status: 400 },
    );
  }

  const signals = await getAccountSignals({ email, domain });
  return NextResponse.json(signals);
}
