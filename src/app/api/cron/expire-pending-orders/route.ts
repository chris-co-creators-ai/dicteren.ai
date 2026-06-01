// Dicteren.ai — Verlopen pending-orders opruimen
//
// Mollie's webhook is de bron van waarheid, maar als die ooit hapert blijft een
// order in `pending` hangen. Deze cron checkt orders die >24u pending staan en
// een Mollie payment-id hebben: vraagt de echte status op en zet failed/canceled
// orders recht. Betaalde-maar-nog-pending orders (gemiste webhook) worden gelogd
// voor handmatige reconciliatie — we fulfillen hier niet (dat hoort in de webhook).

import { NextResponse } from "next/server";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyWebhookPayment, mapMollieStatus } from "@/lib/services/mollie";
import { markOrderStatus } from "@/lib/services/order";
import { logEvent } from "@/lib/services/audit";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db
    .select({
      id: orders.id,
      molliePaymentId: orders.molliePaymentId,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        isNotNull(orders.molliePaymentId),
        lt(orders.createdAt, cutoff),
      ),
    );

  let failed = 0;
  let paidButPending = 0;
  let stillOpen = 0;

  for (const order of stale) {
    if (!order.molliePaymentId) continue;
    const payment = await verifyWebhookPayment(order.molliePaymentId);
    if (!payment.success) continue;

    const status = mapMollieStatus(payment.data.status);
    if (status === "failed" || status === "canceled") {
      await markOrderStatus(order.molliePaymentId, status);
      failed++;
    } else if (status === "paid") {
      // Gemiste webhook — geld is binnen maar order niet fulfilled. Niet
      // automatisch fulfillen (dubbele logica); flaggen voor handmatige check.
      paidButPending++;
      await logEvent({
        action: "order.failed",
        entityType: "order",
        entityId: order.id,
        metadata: {
          reason: "paid_but_pending",
          paymentId: order.molliePaymentId,
          note: "Mollie meldt betaald maar order staat nog pending — webhook gemist. Handmatig fulfillen.",
        },
      });
    } else {
      stillOpen++;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: stale.length,
    failed,
    paidButPending,
    stillOpen,
  });
}
