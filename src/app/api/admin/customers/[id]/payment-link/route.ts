// Dicteren.ai — Betaal-link op maat voor een consument (AM-verstuurd).
//
// Spiegel van de consument-checkout (checkout/consumer): zelfde order +
// buildMollieMetadata + recurring-mandate, zodat de webhook 'm identiek
// fulfilt (licentie + auto-renew). Verschillen: source = "am_outreach", de
// klant wordt door de AM gekozen (niet de sessie-user), en de checkout-link
// gaat per Resend-mail naar de klant i.p.v. een redirect.
//
// Prijs-integriteit: bedrag = planprijs (consument = incl. btw). Met een
// kortingscode rekent validateDiscountCode het post-coupon bedrag autoritatief
// af — de AM kan geen vrij bedrag injecteren.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { requireStaffApi } from "@/lib/auth/session";
import {
  attachMolliePayment,
  createOrder,
  ensureMollieCustomerId,
  getPlanBySlug,
  isRecurringPlan,
  mollieMetadataForOrder,
  periodToMonths,
} from "@/lib/services/order";
import { createCustomerPayment, createPayment } from "@/lib/services/mollie";
import { buildMollieMetadata } from "@/lib/services/mollie-metadata";
import { validateDiscountCode } from "@/lib/services/discount";
import { sendConsumerPaymentLinkEmail } from "@/lib/services/email";
import { logEvent } from "@/lib/services/audit";
import { appBase, webhookUrlFor } from "@/lib/url";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: userId } = await params;

  const [user] = await db
    .select({ id: authUsers.id, email: authUsers.email, name: authUsers.name })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  if (!user?.email) {
    return NextResponse.json(
      { success: false, error: "Klant niet gevonden of geen e-mailadres" },
      { status: 404 },
    );
  }

  let body: { planSlug?: string; discountCode?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const planSlug = body.planSlug?.trim();
  if (!planSlug) {
    return NextResponse.json(
      { success: false, error: "Kies een plan" },
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

  // Bedrag = planprijs; met geldige code → post-coupon bedrag (server-autoritair).
  let payableAmountCents = plan.priceCents;
  let resolvedDiscountId: string | null = null;
  const code = body.discountCode?.trim();
  if (code) {
    const validation = await validateDiscountCode({
      code,
      basisAmountCents: plan.priceCents,
      planId: plan.id,
      seats: 1,
      audience: "consumer",
      periodMonths: periodToMonths(plan.period),
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

  // Recurring vereist een Mollie-customer (mandate) — anders geen auto-renew.
  const customerId = await ensureMollieCustomerId({
    userId: user.id,
    name: user.name,
    email: user.email,
    segment: "consumer",
    source: "admin-grant",
  }).catch(() => null);
  if (isRecurringPlan(plan) && !customerId) {
    return NextResponse.json(
      {
        success: false,
        error: "Betaalprovider tijdelijk niet bereikbaar. Probeer zo opnieuw.",
        code: "MOLLIE_CUSTOMER_UNAVAILABLE",
      },
      { status: 502 },
    );
  }

  const { order, plan: planRow, amountCents, description } = await createOrder({
    userId: user.id,
    planSlug,
    quantity: 1,
    discountCodeId: resolvedDiscountId,
    amountCentsOverride: payableAmountCents,
  });

  const base = appBase();
  const redirectUrl = `${base}/checkout/success?order=${order.id}`;
  const webhookUrl = webhookUrlFor(base);
  const metadata = buildMollieMetadata(
    mollieMetadataForOrder({
      order,
      plan: planRow,
      user: { id: user.id, email: user.email, name: user.name },
      source: "admin-grant",
    }),
  );

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
      metadata: { reason: mollie.error, code: mollie.code, via: "am_payment_link" },
    });
    return NextResponse.json(
      { success: false, error: mollie.error, code: mollie.code },
      { status: 502 },
    );
  }

  await attachMolliePayment(order.id, mollie.data.paymentId, mollie.data.checkoutUrl);

  const mail = await sendConsumerPaymentLinkEmail({
    to: user.email,
    name: user.name,
    planLabel: plan.label,
    amountCents,
    checkoutUrl: mollie.data.checkoutUrl,
    userId: user.id,
    orderId: order.id,
  });

  await logEvent({
    action: "order.payment_link_sent",
    entityType: "order",
    entityId: order.id,
    actorId: session.user.id,
    metadata: {
      userId: user.id,
      planSlug,
      amountCents,
      discountCode: code ?? null,
      emailSent: mail.success,
      via: "am_payment_link",
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      checkoutUrl: mollie.data.checkoutUrl,
      orderId: order.id,
      emailSent: mail.success,
    },
  });
}
