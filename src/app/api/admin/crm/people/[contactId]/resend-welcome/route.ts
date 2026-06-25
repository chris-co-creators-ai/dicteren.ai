// Dicteren.ai — Admin: de welkomstmail van een gepubliceerde partner opnieuw sturen.
// Zelfde inhoud als bij publiceren (account-login + magic-link + landingspagina +
// code), via de gedeelde sendPartnerWelcome-helper. Voor de "opnieuw sturen"-knop
// bij stap 7 in de funnel-cockpit.

import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { requireStaffApi } from "@/lib/auth/session";
import { sendPartnerWelcome } from "@/lib/services/partnerWelcome";

type Params = Promise<{ contactId: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { contactId } = await params;

  if (!session.user.email) {
    return NextResponse.json(
      { success: false, error: "AM-account heeft geen e-mailadres" },
      { status: 422 },
    );
  }

  const r = await sendPartnerWelcome({
    contactId,
    amName: session.user.name || "Dicteren.ai",
    amEmail: session.user.email,
    headers: await nextHeaders(),
  });
  if (!r.ok) {
    return NextResponse.json(
      { success: false, error: r.error ?? "Versturen mislukt" },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true });
}
