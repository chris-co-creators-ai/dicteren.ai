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

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

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

  // Find the linked license's expiresAt so we can tell the user how long
  // their access continues (they paid for the current period already).
  let licenseExpiresAt: Date | null = null;
  if (sub.licenseId) {
    const [lic] = await db
      .select({ expiresAt: licenses.expiresAt })
      .from(licenses)
      .where(eq(licenses.id, sub.licenseId))
      .limit(1);
    licenseExpiresAt = lic?.expiresAt ?? null;
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
