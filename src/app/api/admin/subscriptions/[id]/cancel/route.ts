// Dicteren.ai — Admin: abonnement van een klant opzeggen (G4).
//
// POST /api/admin/subscriptions/{id}/cancel
//
// Spiegelt /api/subscriptions/cancel maar zonder ownership-check (admin/AM mag
// elke klant helpen). Mollie-mandaat stopt; onze sub-rij gaat naar 'canceled';
// de licentie blijft lopen tot expiresAt (klant betaalde de huidige periode).

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { requireStaffApi } from "@/lib/auth/session";
import { cancelMollieSubscription } from "@/lib/services/mollie";
import { logEvent } from "@/lib/services/audit";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);
  if (!sub) {
    return NextResponse.json(
      { success: false, error: "Abonnement niet gevonden" },
      { status: 404 },
    );
  }
  if (sub.status === "canceled") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  const result = await cancelMollieSubscription({
    customerId: sub.mollieCustomerId,
    subscriptionId: sub.mollieSubscriptionId,
  });
  if (!result.success && result.code !== "MOLLIE_NOT_FOUND") {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 502 },
    );
  }

  await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  await logEvent({
    action: "admin.action",
    entityType: "subscription",
    entityId: sub.id,
    actorId: session.user.id,
    metadata: {
      kind: "admin_subscription_cancel",
      mollieSubscriptionId: sub.mollieSubscriptionId,
    },
  });

  return NextResponse.json({ success: true });
}
