// Dicteren.ai — Subscription cancel
//
// User cancels their own subscription from /account/billing.
//  - Verify session, verify ownership.
//  - DELETE on Mollie → mandate stops creating new charges.
//  - Mark our subscription row 'canceled'. License keeps running until
//    expiresAt (user already paid for the current period).

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { licenses, subscriptions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { cancelMollieSubscription } from "@/lib/services/mollie";
import { logEvent } from "@/lib/services/audit";
import { sendCancelEmail } from "@/lib/services/email";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { voidCommissionsForOrder } from "@/lib/services/affiliate";
import { LOCKUP_DAYS } from "@/lib/services/affiliateRules";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const blocked = await enforceRateLimit(request, "subscription:cancel", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  let body: { subscriptionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body ontbreekt" }, { status: 400 });
  }

  if (!body.subscriptionId) {
    return NextResponse.json({ error: "subscriptionId ontbreekt" }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, body.subscriptionId))
    .limit(1);
  if (!sub) {
    return NextResponse.json({ error: "Abonnement niet gevonden" }, { status: 404 });
  }
  if (sub.userId !== session.user.id) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  if (sub.status === "canceled") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  const result = await cancelMollieSubscription({
    customerId: sub.mollieCustomerId,
    subscriptionId: sub.mollieSubscriptionId,
  });

  // Mollie 404 means it's already gone — treat as success.
  if (!result.success && result.code !== "MOLLIE_NOT_FOUND") {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: 502 },
    );
  }

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  await logEvent({
    action: "license.deactivated",
    entityType: "subscription",
    entityId: sub.id,
    actorId: session.user.id,
    metadata: {
      mollieSubscriptionId: sub.mollieSubscriptionId,
      reason: "user_canceled",
    },
  });

  // Find the linked license's expiresAt + orderId zodat we de affiliate-
  // commission kunnen voiden bij cancel-in-lockup.
  let licenseExpiresAt: Date | null = null;
  let linkedOrderId: string | null = null;
  if (sub.licenseId) {
    const [lic] = await db
      .select({ expiresAt: licenses.expiresAt, orderId: licenses.orderId })
      .from(licenses)
      .where(eq(licenses.id, sub.licenseId))
      .limit(1);
    licenseExpiresAt = lic?.expiresAt ?? null;
    linkedOrderId = lic?.orderId ?? null;
  }

  // Cancel-in-lockup: als opgezegd binnen 30 dagen na order → void pending
  // commission ('klant blijft' garantie). Order's createdAt = referentie-punt.
  if (linkedOrderId) {
    const { orders } = await import("@/lib/db/schema");
    const [order] = await db
      .select({ createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.id, linkedOrderId))
      .limit(1);
    if (order) {
      const ageMs = Date.now() - order.createdAt.getTime();
      if (ageMs < LOCKUP_DAYS * 24 * 60 * 60 * 1000) {
        const voided = await voidCommissionsForOrder({
          orderId: linkedOrderId,
          reason: "cancel_in_lockup",
        });
        if (voided.voidedCount > 0) {
          await logEvent({
            action: "affiliate.commission_status_changed",
            entityType: "order",
            entityId: linkedOrderId,
            actorId: session.user.id,
            metadata: {
              reason: "cancel_in_lockup",
              voidedCount: voided.voidedCount,
              daysAge: Math.floor(ageMs / 86_400_000),
            },
          });
        }
      }
    }
  }

  const mail = await sendCancelEmail({
    to: session.user.email,
    name: session.user.name,
    expiresAt: licenseExpiresAt,
    subscriptionId: sub.id,
    licenseId: sub.licenseId ?? undefined,
    userId: session.user.id,
  });
  if (!mail.success) {
    console.warn("[cancel] email failed", mail.error, mail.code);
  }

  return NextResponse.json({ success: true });
}
