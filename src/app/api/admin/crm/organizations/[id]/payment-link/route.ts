// Dicteren.ai — Admin: betaal-link genereren voor CRM-organisatie (Route C)
//
// Flow:
//   1. Pak crm_organization + primaire contact
//   2. Valideer: proposed_plan_slug + proposed_seats + amountCents aanwezig,
//      contact-email aanwezig
//   3. Maak een order met userId = account_owner_id (de AM) en
//      organizationId = null (auth.organization komt pas na paid)
//   4. Maak Mollie one-off payment, metadata.crmOrgId = id
//   5. Sla payment_link_url + payment_link_order_id + payment_link_sent_at op
//   6. Status -> proposal_sent (+ logEvent)
//   7. Stuur sendB2BPaymentLinkEmail naar primaire contact
//   8. crm_event: payment_link_sent

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getCrmOrganization,
  getPrimaryContact,
  logCrmEvent,
} from "@/lib/services/crmDeals";
import { crmOrganizations } from "@/lib/db/schema/crmDeals";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { getPlanBySlug } from "@/lib/services/order";
import { orders } from "@/lib/db/schema";
import { createPayment } from "@/lib/services/mollie";
import { getPricing } from "@/lib/services/pricing";
import { businessAmountCents } from "@/lib/services/pricingTiers";
import { validateDiscountCode } from "@/lib/services/discount";
import { sendB2BPaymentLinkEmail } from "@/lib/services/orgEmail";
import { logEvent } from "@/lib/services/audit";
import { appBase, webhookUrlFor } from "@/lib/url";

type Params = Promise<{ id: string }>;

export async function POST(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: orgId } = await params;

  const org = await getCrmOrganization(orgId);
  if (!org) {
    return NextResponse.json(
      { success: false, error: "Organisatie niet gevonden" },
      { status: 404 },
    );
  }

  // Validatie: alle data aanwezig voor checkout?
  if (!org.proposedPlanSlug) {
    return NextResponse.json(
      { success: false, error: "Plan-slug ontbreekt (vul in op Details-tab)" },
      { status: 400 },
    );
  }
  if (!org.proposedSeats || org.proposedSeats < 1) {
    return NextResponse.json(
      { success: false, error: "Aantal seats ontbreekt" },
      { status: 400 },
    );
  }
  if (!org.proposedAmountCents || org.proposedAmountCents < 100) {
    return NextResponse.json(
      { success: false, error: "Voorgesteld bedrag ontbreekt of te laag" },
      { status: 400 },
    );
  }

  const primary = await getPrimaryContact(orgId);
  if (!primary?.email) {
    return NextResponse.json(
      { success: false, error: "Voeg eerst een primair contact toe" },
      { status: 400 },
    );
  }

  const plan = await getPlanBySlug(org.proposedPlanSlug);
  if (!plan || !plan.isActive || plan.customerType !== "organization") {
    return NextResponse.json(
      { success: false, error: `Plan '${org.proposedPlanSlug}' niet beschikbaar` },
      { status: 400 },
    );
  }

  // ───── Te factureren bedrag bepalen ─────
  // SSOT-lijstprijs voor deze seats × periode. Twee gevallen:
  //  - MET coupon: de reseller-coupon (door de AM op maat aangemaakt) draagt de
  //    afgesproken korting. De server rekent het post-coupon bedrag autoritatief
  //    af — de AM hoeft niks uit te rekenen.
  //  - ZONDER coupon: de AM mag een maatwerk-bedrag invullen, maar dat moet
  //    binnen ±2% van de staffelprijs liggen (typfout-guard). 50+ = vrij.
  const pricing = await getPricing();
  const seats = org.proposedSeats;
  const isCustomQuote = seats >= pricing.customQuoteFrom;
  const ssotAmountCents = businessAmountCents(pricing, seats, plan.period);
  const fmtEur = (c: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
      c / 100,
    );

  let resolvedDiscountId: string | null = null;
  let discountSnapshot: { type: string; value: number } | null = null;
  let chargeAmountCents = org.proposedAmountCents;

  if (org.discountCode) {
    const validation = await validateDiscountCode({
      code: org.discountCode,
      basisAmountCents: ssotAmountCents,
      planId: plan.id,
      seats,
      audience: "organization",
    });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Kortingscode '${org.discountCode}': ${validation.error}`,
          code: `DISCOUNT_${validation.code}`,
        },
        { status: 400 },
      );
    }
    // Server rekent het post-coupon bedrag — AM-bedrag wordt niet gebruikt.
    chargeAmountCents = validation.payableAmountCents;
    resolvedDiscountId = validation.discount.id;
    discountSnapshot = {
      type: validation.discount.type,
      value:
        validation.discount.type === "percentage"
          ? validation.discount.value
          : validation.discountAmountCents,
    };
  } else if (!isCustomQuote && ssotAmountCents > 0) {
    // Geen coupon: AM-bedrag mag maximaal 2% van de staffelprijs afwijken.
    const drift =
      Math.abs(org.proposedAmountCents - ssotAmountCents) / ssotAmountCents;
    if (drift > 0.02) {
      return NextResponse.json(
        {
          success: false,
          error: `Bedrag ${fmtEur(org.proposedAmountCents)} wijkt te veel af van de staffelprijs ${fmtEur(ssotAmountCents)}. Pas het bedrag aan, of maak een reseller-coupon aan voor een afgesproken korting.`,
          code: "AMOUNT_OUT_OF_RANGE",
        },
        { status: 400 },
      );
    }
  }

  if (chargeAmountCents < 100) {
    return NextResponse.json(
      { success: false, error: "Te factureren bedrag is te laag.", code: "AMOUNT_TOO_LOW" },
      { status: 400 },
    );
  }

  // Account-manager userId (voor orders.userId NOT NULL constraint)
  const ownerId = org.accountOwnerId ?? session.user.id;

  // Order aanmaken
  const [order] = await db
    .insert(orders)
    .values({
      userId: ownerId,
      organizationId: null,
      planId: plan.id,
      quantity: org.proposedSeats,
      amountCents: chargeAmountCents,
      currency: plan.currency,
      status: "pending",
      discountCodeId: resolvedDiscountId,
    })
    .returning();

  // Mollie payment
  const base = appBase();
  const webhookUrl = webhookUrlFor(base);
  const redirectUrl = `${base}/checkout/success?order=${order.id}`;
  const description = `Dicteren.ai · ${plan.label} (${org.proposedSeats} seats) — ${org.name}`;
  const mollie = await createPayment({
    amountCents: chargeAmountCents,
    description,
    redirectUrl,
    webhookUrl,
    metadata: {
      orderId: order.id,
      crmOrgId: org.id,
      crmContactId: primary.id,
      crmContactEmail: primary.email,
      crmContactName: primary.name,
      organizationName: org.name,
      planSlug: org.proposedPlanSlug,
      seats: org.proposedSeats,
      source: "am_outreach",
      ...(org.discountCode ? { discountCode: org.discountCode } : {}),
      ...(discountSnapshot
        ? {
            discountType: discountSnapshot.type,
            discountValue: discountSnapshot.value,
          }
        : {}),
    },
  });

  if (!mollie.success) {
    return NextResponse.json(
      { success: false, error: mollie.error ?? "Mollie-betaling mislukt" },
      { status: 502 },
    );
  }

  // Order: koppel Mollie payment-id + checkout-url
  await db
    .update(orders)
    .set({
      molliePaymentId: mollie.data.paymentId,
      mollieCheckoutUrl: mollie.data.checkoutUrl,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  // crm_organization patchen
  const wasFirstSent = !org.paymentLinkSentAt;
  await db
    .update(crmOrganizations)
    .set({
      paymentLinkOrderId: order.id,
      paymentLinkUrl: mollie.data.checkoutUrl,
      paymentLinkSentAt: new Date(),
      status: "proposal_sent",
      updatedAt: new Date(),
    })
    .where(eq(crmOrganizations.id, org.id));

  // Event loggen
  await logCrmEvent({
    crmOrganizationId: org.id,
    crmContactId: primary.id,
    actorUserId: session.user.id,
    kind: wasFirstSent ? "payment_link_generated" : "payment_link_resent",
    payload: {
      orderId: order.id,
      checkoutUrl: mollie.data.checkoutUrl,
      amountCents: chargeAmountCents,
      seats: org.proposedSeats,
    },
  });

  await logEvent({
    action: "crm_org.payment_link_sent",
    entityType: "crm_organization",
    entityId: org.id,
    actorId: session.user.id,
    metadata: {
      orderId: order.id,
      contactEmail: primary.email,
      amountCents: chargeAmountCents,
    },
  });

  // Mail versturen
  const [ownerRow] = await db
    .select({ name: authUsers.name })
    .from(authUsers)
    .where(eq(authUsers.id, ownerId))
    .limit(1);

  const mailResult = await sendB2BPaymentLinkEmail({
    to: primary.email,
    contactName: primary.name,
    organizationName: org.name,
    seats: org.proposedSeats,
    amountCents: chargeAmountCents,
    planLabel: plan.label,
    checkoutUrl: mollie.data.checkoutUrl,
    accountManagerName: ownerRow?.name,
    isResend: false,
  });

  await logCrmEvent({
    crmOrganizationId: org.id,
    crmContactId: primary.id,
    actorUserId: session.user.id,
    kind: "payment_link_sent",
    payload: {
      to: primary.email,
      emailSuccess: mailResult.success,
      emailId: mailResult.success ? mailResult.data.id : null,
      emailError: mailResult.success ? null : mailResult.error,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      checkoutUrl: mollie.data.checkoutUrl,
      orderId: order.id,
      emailSent: mailResult.success,
    },
  });
}
