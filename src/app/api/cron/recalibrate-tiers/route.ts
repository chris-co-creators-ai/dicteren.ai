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
import {
  businessAmountCents,
  tierForSeats,
  type BillingPeriod,
} from "@/lib/services/pricingTiers";
import { getPricing } from "@/lib/services/pricing";
import { logEvent } from "@/lib/services/audit";

/** Mollie-interval-label → onze periode. */
function periodFromInterval(interval: string | null): BillingPeriod {
  if (interval === "1 month") return "monthly";
  if (interval === "3 months") return "quarterly";
  return "yearly";
}

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
      intervalLabel: subscriptions.intervalLabel,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "past_due"]));

  const pricing = await getPricing();
  let drifts = 0;
  for (const sub of active) {
    if (!sub.organizationId) continue;
    const snapshot = await getOrgSeatSnapshot(sub.organizationId);
    const period = periodFromInterval(sub.intervalLabel);
    const expectedTier = tierForSeats(pricing, snapshot.totalSeats);
    const expectedAmount = businessAmountCents(
      pricing,
      snapshot.totalSeats,
      period,
    );

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
