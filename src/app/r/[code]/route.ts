// Shortlink `dicteren.ai/r/{code}` → zet de first-touch attributie-cookie → redirect
// naar de homepage. Dubbel: `AFF-`-codes = cash-reseller-affiliate (affiliate-cookie,
// bestaande checkout/commissie-keten). Andere codes = vriend-invite (referral-cookie,
// gratis-maanden-keten). Eén link-vorm, twee programma's.

import { NextResponse } from "next/server";
import { getAffiliateByCode } from "@/lib/services/affiliate";
import { getReferrerByCode } from "@/lib/services/referral";
import { setRefCookie } from "@/lib/affiliateCookie";
import { setReferralCookie } from "@/lib/referralCookie";
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
  const norm = (code ?? "").trim().toUpperCase();

  if (norm.startsWith("AFF-")) {
    // Cash-reseller-affiliate. setRefCookie is first-touch.
    const aff = await getAffiliateByCode(norm);
    if (aff && aff.status === "active") {
      await setRefCookie({ affiliateId: aff.id, source: "url-ref" });
    }
  } else {
    // Vriend-invite (gratis maanden). first-touch.
    const referrerUserId = await getReferrerByCode(norm);
    if (referrerUserId) {
      await setReferralCookie({ referrerUserId, code: norm });
    }
  }

  return NextResponse.redirect(home);
}
