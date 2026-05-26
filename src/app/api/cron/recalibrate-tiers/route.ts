// Dicteren.ai — Daily tier-recalibratie
//
// Checkt of de subscription-amount klopt met aantal seats × tier-prijs.
// Bij drift (= owner heeft seat aangepast zonder Mollie-replace, bv. via
// admin-grant): log audit. MVP: alleen flag, geen automatische fix.

import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getOrgSeatSnapshot } from "@/lib/services/orgSeats";
import { getTierForSeats } from "@/lib/services/pricingTiers";
import { logEvent } from "@/lib/services/audit";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const active = await db
    .select({
      id: subscriptions.id,
      organizationId: subscriptions.organizationId,
      amountCents: subscriptions.amountCents,
      seats: subscriptions.seats,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "past_due"]));

  let drifts = 0;
  for (const sub of active) {
    if (!sub.organizationId) continue;
    const snapshot = await getOrgSeatSnapshot(sub.organizationId);
    const expectedTier = getTierForSeats(snapshot.totalSeats);
    const expectedAmount = expectedTier.pricePerSeatCents * snapshot.totalSeats;

    const seatsDrift = snapshot.totalSeats !== sub.seats;
    const amountDrift = Math.abs(sub.amountCents - expectedAmount) > 100; // €1 tolerance

    if (seatsDrift || amountDrift) {
      await logEvent({
        action: "organization.tier_changed",
        entityType: "organization",
        entityId: sub.organizationId,
        metadata: {
          reason: "drift_detected",
          subscriptionSeats: sub.seats,
          actualSeats: snapshot.totalSeats,
          subscriptionAmount: sub.amountCents,
          expectedAmount,
          tier: expectedTier.id,
        },
      });
      drifts++;
    }
  }

  return NextResponse.json({ ok: true, checked: active.length, drifts });
}
