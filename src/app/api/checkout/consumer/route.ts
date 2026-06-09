import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
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
import { logEvent, trackEvent } from "@/lib/services/audit";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { validateDiscountCode } from "@/lib/services/discount";
import {
  attributeUserToAffiliate,
  getAffiliateByCode,
  getReferralForUser,
} from "@/lib/services/affiliate";
import { getAffiliateBySlug } from "@/lib/services/affiliateSlug";
import { getRefCookie } from "@/lib/affiliateCookie";
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

  let body: {
    planSlug?: string;
    discountCode?: string | null;
    affiliateCode?: string | null;
    affiliateSlug?: string | null;
    method?: string | null;
  };
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

  await trackEvent("checkout_started", {
    planSlug,
    customerType: "consumer",
  });

  // ───── Affiliate attribution ─────
  // Volgorde: expliciete affiliateCode body-field > affiliateSlug body-field
  // > ref_aff_id cookie (gezet door /[slug]-route). First-touch wins:
  // attributeUserToAffiliate doet onConflictDoNothing op userId.
  let resolvedAffiliateId: string | null = null;
  if (body.affiliateCode) {
    const aff = await getAffiliateByCode(body.affiliateCode);
    if (aff && aff.status === "active") resolvedAffiliateId = aff.id;
  }
  if (!resolvedAffiliateId && body.affiliateSlug) {
    const aff = await getAffiliateBySlug(body.affiliateSlug);
    if (aff && aff.status === "active") resolvedAffiliateId = aff.id;
  }
  if (!resolvedAffiliateId) {
    const cookie = await getRefCookie();
    if (cookie?.affiliateId) {
      const existingRef = await getReferralForUser(session.user.id);
      // Lookup om te checken of affiliate nog active is bij gebruik
      const aff = await (
        await import("@/lib/services/affiliate")
      ).getAffiliateById(cookie.affiliateId);
      if (aff && aff.status === "active") {
        resolvedAffiliateId = aff.id;
      }
      void existingRef;
    }
  }
  if (resolvedAffiliateId) {
    const result = await attributeUserToAffiliate({
      affiliateId: resolvedAffiliateId,
      userId: session.user.id,
      attributionSource: body.affiliateCode
        ? "url-ref"
        : body.affiliateSlug
          ? "slug"
          : "cookie",
    });
    if (result.created) {
      await logEvent({
        action: "affiliate.attributed",
        entityType: "affiliate",
        entityId: resolvedAffiliateId,
        actorId: session.user.id,
        metadata: {
          source: body.affiliateCode
            ? "url-ref"
            : body.affiliateSlug
              ? "slug"
              : "cookie",
          customerType: "consumer",
        },
      });
    }
  }

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

  // Methode-keuze komt van onze eigen checkout-stap. Alleen first-payment-
  // capabele methodes toestaan (iDEAL/creditcard); een ongeldige of lege
  // waarde valt terug op undefined → Mollie toont z'n eigen keuzescherm.
  const allowedMethods = ["ideal", "creditcard"];
  const method =
    body.method && allowedMethods.includes(body.method)
      ? body.method
      : undefined;

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
          method,
        })
      : await createPayment({
          amountCents,
          description,
          redirectUrl,
          webhookUrl,
          metadata,
          method,
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
