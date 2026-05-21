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
import { trackEvent } from "@/lib/services/audit";

function webhookUrlFor(base: string): string | undefined {
  if (/localhost|127\.0\.0\.1/.test(base)) return undefined;
  return `${base}/api/mollie/webhook`;
}

function appBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  let body: {
    planSlug?: string;
    seats?: number;
    organizationName?: string;
    organizationId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const { planSlug, seats, organizationName, organizationId } = body;

  if (!planSlug) {
    return NextResponse.json(
      { success: false, error: "planSlug ontbreekt" },
      { status: 400 },
    );
  }

  const seatCount = Math.max(1, Math.floor(Number(seats ?? 1)));
  if (seatCount > 49) {
    return NextResponse.json(
      {
        success: false,
        error: "Voor 50+ seats vragen we een maatwerk-offerte.",
        code: "CUSTOM_QUOTE_REQUIRED",
      },
      { status: 400 },
    );
  }

  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.customerType !== "organization" || !plan.isActive) {
    return NextResponse.json(
      { success: false, error: "Plan niet beschikbaar" },
      { status: 400 },
    );
  }

  await trackEvent("checkout_started", {
    planSlug,
    customerType: "organization",
    seats: seatCount,
  });

  const customerId = await ensureMollieCustomerId({
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }).catch(() => null);

  const { order, plan: planRow, amountCents, description } = await createOrder({
    userId: session.user.id,
    planSlug,
    organizationId: organizationId ?? null,
    quantity: seatCount,
  });

  const base = appBase();
  const fullDescription = `${description}${organizationName ? ` — ${organizationName}` : ""}`;
  const redirectUrl = `${base}/checkout/success?order=${order.id}`;
  const webhookUrl = webhookUrlFor(base);
  const metadata = {
    orderId: order.id,
    userId: session.user.id,
    planSlug,
    seats: seatCount,
    organizationName: organizationName ?? null,
    organizationId: organizationId ?? null,
    email: session.user.email,
    name: session.user.name,
  };

  const mollie =
    customerId && isRecurringPlan(planRow)
      ? await createCustomerPayment({
          customerId,
          sequenceType: "first",
          amountCents,
          description: fullDescription,
          redirectUrl,
          webhookUrl,
          metadata,
        })
      : await createPayment({
          amountCents,
          description: fullDescription,
          redirectUrl,
          webhookUrl,
          metadata,
        });

  if (!mollie.success) {
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
