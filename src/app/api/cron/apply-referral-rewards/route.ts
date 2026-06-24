// Dicteren.ai — cron: pending referral-rewards (vrienden uitnodigen) toepassen.
//
// Een gratis maand wordt toegekend als 'pending' (bij signup voor de aangebrachte,
// bij betaling voor de aanbrenger). Deze cron levert 'm uit: verleng de licentie
// `expiresAt` +N maanden. Idempotent (claim-first in applyReward). De aanbrenger
// krijgt z'n maand meestal al direct bij qualify; dit vangt de rest (bv. een
// aangebrachte die z'n trial pas later claimt).

import { NextResponse } from "next/server";
import { applyPendingReferralRewards } from "@/lib/services/referral";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await applyPendingReferralRewards();
  return NextResponse.json({ ok: true, ...result });
}
