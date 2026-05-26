import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  attachMolliePayment,
  createOrder,
  ensureMollieCustomerId,
  getPlanBySlug,
  isRecurringPlan,
  mollieMetadataForOrder,
} from "@/lib/services/order";
import { createCustomerPayment, createPayment } from "@/lib/services/mollie";
import { buildMollieMetadata } from "@/lib/services/mollie-metadata";
import { logEvent, trackEvent } from "@/lib/services/audit";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { validateDiscountCode } from "@/lib/services/discount";
import { appBase, webhookUrlFor } from "@/lib/url";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  const blocked = await enforceRateLimit(request, "checkout:consumer", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  let body: { planSlug?: string; discountCode?: string | null };
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

  // Discount-code validatie + payable-amount override. Codes met
  // appliesTo="organization" worden geweigerd voor consumer-checkout.
  const listAmountCents = plan.priceCents;
  let payableAmountCents = listAmountCents;
  let resolvedDiscountId: string | null = null;
  if (body.discountCode) {
    const validation = await validateDiscountCode({
      code: body.discountCode,
      basisAmountCents: listAmountCents,
      planId: plan.id,
      seats: 1,
      audience: "consumer",
    });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, code: `DISCOUNT_${validation.code}` },
        { status: 400 },
      );
    }
    payableAmountCents = validation.payableAmountCents;
    resolvedDiscountId = validation.discount.id;
  }

  await trackEvent("checkout_started", {
    planSlug,
    customerType: "consumer",
  });

  const customerId = await ensureMollieCustomerId({
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    segment: "consumer",
    source: "self-signup",
  }).catch(() => null);

  // Recurring plans VEREISEN een Mollie customer (anders geen mandate, geen
  // auto-renew). Bij customer-creation failure tijdens checkout: stoppen.
  // Zonder deze guard zou de user eenmalig betalen en daarna geen incasso
  // krijgen — stille downgrade van subscription naar one-off.
  if (isRecurringPlan(plan) && !customerId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Tijdelijk probleem bij onze betaalprovider. Probeer over een minuut opnieuw.",
        code: "MOLLIE_CUSTOMER_UNAVAILABLE",
      },
      { status: 502 },
    );
  }

  const { order, plan: planRow, amountCents, description } = await createOrder({
    userId: session.user.id,
    planSlug,
    quantity: 1,
    discountCodeId: resolvedDiscountId,
    amountCentsOverride: payableAmountCents,
  });

  const base = appBase();
  const metadata = buildMollieMetadata(
    mollieMetadataForOrder({
      order,
      plan: planRow,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      source: "self-signup",
    }),
  );
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
