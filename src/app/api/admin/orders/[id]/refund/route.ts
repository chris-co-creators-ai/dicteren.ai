// Dicteren.ai — Admin refund endpoint
//
// POST /api/admin/orders/{id}/refund
//
// Triggert een Mollie refund. Volledig (amountCents weglaten) of partieel.
// Onze license/order status wordt NIET hier omgezet — dat doet de Mollie
// refund-webhook bij definitieve bevestiging (single source of truth).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { refundOrder } from "@/lib/services/order";
import { logEvent } from "@/lib/services/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const { id: orderId } = await params;

  let body: { amountCents?: number; description?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await refundOrder({
    orderId,
    actorUserId: session.user.id,
    amountCents: body.amountCents,
    description: body.description,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: result.code === "NOT_FOUND" ? 404 : 400 },
    );
  }

  await logEvent({
    action: "order.refunded",
    entityType: "order",
    entityId: orderId,
    actorId: session.user.id,
    metadata: {
      refundId: result.refundId,
      mollieStatus: result.status,
      amountCents: result.amountCents,
      reason: body.description ?? null,
      partial: typeof body.amountCents === "number",
    },
  });

  return NextResponse.json({
    success: true,
    refundId: result.refundId,
    status: result.status,
    amountCents: result.amountCents,
  });
}
