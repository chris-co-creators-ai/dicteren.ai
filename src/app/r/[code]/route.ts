// Self-serve referral-shortlink (PRD self-serve-referral, Fase 2).
// `dicteren.ai/r/{code}` → zet de first-touch attributie-cookie (90d) → redirect
// naar de homepage. Dít is de deelbare link die een referrer uit de voordeur krijgt.
// Vanaf de cookie pakt de bestaande keten het op (checkout + Mollie-webhook →
// attributeUserToAffiliate → recurring commissie). Geen nieuwe attributie-logica.

import { NextResponse } from "next/server";
import { getAffiliateByCode } from "@/lib/services/affiliate";
import { setRefCookie } from "@/lib/affiliateCookie";
import { enforceRateLimit } from "@/lib/services/rateLimit";

type Params = Promise<{ code: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params },
) {
  const home = new URL("/", request.url);

  const blocked = await enforceRateLimit(request, "referral:click");
  if (blocked) return blocked;

  const { code } = await params;
  // Codes zijn altijd uppercase (AFF-XXXXXXXX); normaliseer een verkeerd-gecaste link.
  const aff = await getAffiliateByCode((code ?? "").trim().toUpperCase());

  // Onbekende of niet-actieve code: geen cookie, gewoon door naar de homepage.
  // setRefCookie is first-touch — een bestaande cookie blijft staan.
  if (aff && aff.status === "active") {
    await setRefCookie({ affiliateId: aff.id, source: "url-ref" });
  }

  return NextResponse.redirect(home);
}
