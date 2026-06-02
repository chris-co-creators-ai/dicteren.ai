// Dicteren.ai — Admin: handmatig fulfillen van een pending order
//
// POST /api/admin/orders/{id}/fulfill
//
// Voor het zeldzame geval dat Mollie's webhook is gemist en een betaalde order
// in `pending` blijft hangen. Re-triggert de idempotente webhook met de echte
// Mollie-status — dus fulfill + mail + subscription + commissie lopen via exact
// dezelfde (idempotente) code als een normale webhook. Geen dubbele logica.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { licenses, orders } from "@/lib/db/schema";
import { requireStaffApi } from "@/lib/auth/session";
import { logEvent } from "@/lib/services/audit";
import { appBase, webhookUrlFor } from "@/lib/url";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const { id: orderId } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      molliePaymentId: orders.molliePaymentId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order niet gevonden" },
      { status: 404 },
    );
  }
  if (!order.molliePaymentId) {
    return NextResponse.json(
      { success: false, error: "Order heeft geen Mollie payment-id." },
      { status: 400 },
    );
  }

  // Guard op het echte invariant: is er al een licentie voor deze order? Zo ja
  // → echt klaar, niets te doen. Een order die op "paid" staat maar ZONDER
  // licentie (halve fulfillment, B1-scenario) mag wél opnieuw — de idempotente
  // webhook + fulfillPaidOrder herstelt 'm dan alsnog.
  const [existingLicense] = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(eq(licenses.orderId, order.id))
    .limit(1);
  if (existingLicense) {
    return NextResponse.json(
      { success: false, error: "Order is al verwerkt: er bestaat al een licentie." },
      { status: 400 },
    );
  }

  const base = appBase();
  const webhookUrl = webhookUrlFor(base);
  if (!webhookUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "Webhook-URL niet beschikbaar (lokaal/zonder publieke base-URL).",
      },
      { status: 503 },
    );
  }

  // Re-trigger de webhook met de payment-id in de query (zo leest extractPaymentId 'm).
  const res = await fetch(
    `${webhookUrl}?id=${encodeURIComponent(order.molliePaymentId)}`,
    { method: "POST" },
  );
  const data = await res.json().catch(() => ({}));

  await logEvent({
    action: "admin.action",
    entityType: "order",
    entityId: order.id,
    actorId: session.user.id,
    metadata: {
      action: "manual_fulfill_retrigger",
      paymentId: order.molliePaymentId,
      webhookStatus: res.status,
    },
  });

  return NextResponse.json({
    success: res.ok,
    webhookStatus: res.status,
    result: data,
    error: res.ok
      ? undefined
      : "De webhook kon de betaling niet verwerken — check de Mollie-status van deze order.",
  });
}
