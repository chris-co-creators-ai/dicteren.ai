// Dicteren.ai — Daily Mollie-subscription reconciliation
//
// Voor elke actieve subscription in onze DB: vraag Mollie de status op.
// Bij mismatch (Mollie zegt canceled / suspended / completed, wij zeggen
// active): log + audit. Owner moet handmatig acteren.
//
// MVP: alleen LOG-en, geen mutaties — geeft admin tijd om te reageren.

import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { getMollieSubscription } from "@/lib/services/mollie";
import { logEvent } from "@/lib/services/audit";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const active = await db
    .select({
      id: subscriptions.id,
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      mollieCustomerId: subscriptions.mollieCustomerId,
      status: subscriptions.status,
      organizationId: subscriptions.organizationId,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "past_due"]));

  let mismatches = 0;
  for (const sub of active) {
    const result = await getMollieSubscription({
      customerId: sub.mollieCustomerId,
      subscriptionId: sub.mollieSubscriptionId,
    });
    if (!result.success) {
      if (result.code === "MOLLIE_NOT_FOUND") {
        await logEvent({
          action: "organization.subscription_failed",
          entityType: "organization",
          entityId: sub.organizationId ?? sub.id,
          metadata: {
            reason: "mollie_subscription_missing",
            mollieSubscriptionId: sub.mollieSubscriptionId,
          },
        });
        mismatches++;
      }
      continue;
    }
    // Mollie zegt canceled maar wij zeggen active → mismatch
    if (
      (result.data.status === "canceled" ||
        result.data.status === "completed" ||
        result.data.status === "suspended") &&
      sub.status === "active"
    ) {
      await logEvent({
        action: "organization.subscription_failed",
        entityType: "organization",
        entityId: sub.organizationId ?? sub.id,
        metadata: {
          reason: "status_mismatch",
          ourStatus: sub.status,
          mollieStatus: result.data.status,
          mollieSubscriptionId: sub.mollieSubscriptionId,
        },
      });
      mismatches++;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: active.length,
    mismatches,
  });
}
