import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  attachMolliePayment,
  createOrder,
  ensureMollieCustomerId,
  getPlanBySlug,
  isRecurringPlan,
} from "@/lib/services/order";
import { createCustomerPayment, createPayment } from "@/lib/services/mollie";
import { logEvent, trackEvent } from "@/lib/services/audit";

function appBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

/** Mollie rejects unreachable webhook URLs. Skip on localhost. */
function webhookUrlFor(base: string): string | undefined {
  if (/localhost|127\.0\.0\.1/.test(base)) return undefined;
  return `${base}/api/mollie/webhook`;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  let body: { planSlug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const planSlug = body.planSlug;
  if (!planSlug) {
    return NextResponse.json(
      { success: false, error: "planSlug ontbreekt" },
      { status: 400 },
    );
  }

  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.customerType !== "consumer" || !plan.isActive) {
    return NextResponse.json(
      { success: false, error: "Plan niet beschikbaar" },
      { status: 400 },
    );
  }

  await trackEvent("checkout_started", {
    planSlug,
    customerType: "consumer",
  });

  const customerId = await ensureMollieCustomerId({
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }).catch(() => null);

  const { order, plan: planRow, amountCents, description } = await createOrder({
    userId: session.user.id,
    planSlug,
    quantity: 1,
  });

  const base = appBase();
  const metadata = {
    orderId: order.id,
    userId: session.user.id,
    planSlug,
    email: session.user.email,
    name: session.user.name,
  };
  const redirectUrl = `${base}/checkout/success?order=${order.id}`;
  const webhookUrl = webhookUrlFor(base);

  // Recurring plan + Mollie customer → sequenceType "first" so mandate is set
  // and we can schedule auto-renewals from the webhook.
  const mollie =
    customerId && isRecurringPlan(planRow)
      ? await createCustomerPayment({
          customerId,
          sequenceType: "first",
          amountCents,
          description,
          redirectUrl,
          webhookUrl,
          metadata,
        })
      : await createPayment({
          amountCents,
          description,
          redirectUrl,
          webhookUrl,
          metadata,
        });

  if (!mollie.success) {
    await logEvent({
      action: "order.failed",
      entityType: "order",
      entityId: order.id,
      actorId: session.user.id,
      metadata: { reason: mollie.error, code: mollie.code },
    });
    return NextResponse.json(
      { success: false, error: mollie.error, code: mollie.code },
      { status: 502 },
    );
  }

  await attachMolliePayment(
    order.id,
    mollie.data.paymentId,
    mollie.data.checkoutUrl,
  );

  return NextResponse.json({
    success: true,
    orderId: order.id,
    checkoutUrl: mollie.data.checkoutUrl,
  });
}
