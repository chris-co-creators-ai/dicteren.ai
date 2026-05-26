// Dicteren.ai — Zakelijke checkout
//
// Self-service team-aankoop: gebruiker geeft (verplicht) organisatie-naam,
// billing-velden + (optioneel) VAT op. Server maakt een Better Auth org aan
// (= huidige user wordt automatisch owner), upsert billing, maakt order +
// Mollie payment, en koppelt eventuele affiliate-referral aan de order.
//
// Bestaande org (member) flow: als organizationId wordt meegestuurd én de
// session-user is owner/admin van die org, wordt geen nieuwe org aangemaakt
// maar de bestaande hergebruikt voor een nieuwe order (bv. seat-uitbreiding).

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authMember } from "@/lib/db/auth-schema";
import { auth } from "@/lib/auth/server";
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
import {
  deriveOrganizationSlug,
  upsertOrganizationBilling,
} from "@/lib/services/organization";
import {
  attributeUserToAffiliate,
  getAffiliateByCode,
  getReferralForUser,
} from "@/lib/services/affiliate";
import { validateDiscountCode } from "@/lib/services/discount";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { getTierForSeats } from "@/lib/services/pricingTiers";
import { appBase, webhookUrlFor } from "@/lib/url";

type BillingInput = {
  organizationName: string;
  billingEmail: string;
  countryCode: string;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  vatNumber?: string | null;
  purchaseOrderNumber?: string | null;
};

function clientError(status: number, error: string, code: string) {
  return NextResponse.json({ success: false, error, code }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return clientError(401, "Inloggen vereist", "UNAUTH");
  }

  const blocked = await enforceRateLimit(request, "checkout:organization", {
    key: `user:${session.user.id}`,
  });
  if (blocked) return blocked;

  let body: {
    planSlug?: string;
    seats?: number;
    organizationId?: string;
    billing?: BillingInput;
    affiliateCode?: string | null;
    discountCode?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return clientError(400, "Body ontbreekt", "INVALID_BODY");
  }

  const {
    planSlug,
    seats,
    organizationId,
    billing,
    affiliateCode,
    discountCode,
  } = body;

  if (!planSlug) return clientError(400, "planSlug ontbreekt", "MISSING_PLAN");

  const seatCount = Math.max(1, Math.floor(Number(seats ?? 1)));
  if (seatCount > 49) {
    return clientError(
      400,
      "Voor 50+ seats vragen we een maatwerk-offerte.",
      "CUSTOM_QUOTE_REQUIRED",
    );
  }

  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.customerType !== "organization" || !plan.isActive) {
    return clientError(400, "Plan niet beschikbaar", "PLAN_INACTIVE");
  }

  // ───── Pad A: bestaande org → check membership ─────
  let resolvedOrgId: string | null = null;

  if (organizationId) {
    const [membership] = await db
      .select({ role: authMember.role })
      .from(authMember)
      .where(
        and(
          eq(authMember.userId, session.user.id),
          eq(authMember.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!membership) {
      return clientError(
        403,
        "Je bent geen lid van deze organisatie.",
        "NOT_A_MEMBER",
      );
    }
    if (membership.role !== "owner" && membership.role !== "admin") {
      return clientError(
        403,
        "Alleen organisatie-beheerders kunnen aankopen doen.",
        "INSUFFICIENT_ROLE",
      );
    }
    resolvedOrgId = organizationId;
  } else {
    // ───── Pad B: nieuwe org maken ─────
    if (!billing?.organizationName?.trim()) {
      return clientError(
        400,
        "Bedrijfsnaam is verplicht.",
        "MISSING_ORG_NAME",
      );
    }
    if (
      !billing.billingEmail?.trim() ||
      !billing.addressLine1?.trim() ||
      !billing.postalCode?.trim() ||
      !billing.city?.trim() ||
      !billing.countryCode?.trim()
    ) {
      return clientError(
        400,
        "Volledige factuuradres-gegevens zijn verplicht.",
        "MISSING_BILLING",
      );
    }

    const slug = deriveOrganizationSlug(billing.organizationName);
    // Better Auth's createOrganization: met session-headers wordt de
    // current user automatisch owner van de nieuwe org (member.role = "owner").
    let createdOrg;
    try {
      createdOrg = await auth.api.createOrganization({
        headers: await headers(),
        body: {
          name: billing.organizationName.trim(),
          slug,
          keepCurrentActiveOrganization: false,
        },
      });
    } catch (err) {
      console.error("[checkout/org] createOrganization failed", err);
      return clientError(
        500,
        "Aanmaken van organisatie mislukt. Probeer opnieuw.",
        "ORG_CREATE_FAILED",
      );
    }
    if (!createdOrg?.id) {
      return clientError(
        500,
        "Aanmaken van organisatie gaf geen ID terug.",
        "ORG_CREATE_EMPTY",
      );
    }
    resolvedOrgId = createdOrg.id;

    await logEvent({
      action: "organization.created",
      entityType: "organization",
      entityId: resolvedOrgId,
      actorId: session.user.id,
      metadata: { name: billing.organizationName, slug },
    });
  }

  // ───── Billing-row upsert ─────
  if (billing && resolvedOrgId) {
    await upsertOrganizationBilling(resolvedOrgId, {
      billingEmail: billing.billingEmail ?? null,
      vatNumber: billing.vatNumber ?? null,
      countryCode: billing.countryCode ?? null,
      addressLine1: billing.addressLine1 ?? null,
      addressLine2: billing.addressLine2 ?? null,
      postalCode: billing.postalCode ?? null,
      city: billing.city ?? null,
      purchaseOrderNumber: billing.purchaseOrderNumber ?? null,
      notes: null,
    });
    await logEvent({
      action: "organization.billing_updated",
      entityType: "organization",
      entityId: resolvedOrgId,
      actorId: session.user.id,
      metadata: { source: "checkout" },
    });
  }

  // ───── Affiliate attribution (lifetime, first-touch) ─────
  if (affiliateCode) {
    const aff = await getAffiliateByCode(affiliateCode);
    if (aff && aff.status === "active") {
      const existing = await getReferralForUser(session.user.id);
      if (!existing) {
        const result = await attributeUserToAffiliate({
          affiliateId: aff.id,
          userId: session.user.id,
          organizationId: resolvedOrgId,
          attributionSource: "url-ref",
        });
        if (result.created) {
          await logEvent({
            action: "affiliate.attributed",
            entityType: "affiliate",
            entityId: aff.id,
            actorId: session.user.id,
            metadata: { code: affiliateCode, organizationId: resolvedOrgId },
          });
        }
      } else if (!existing.organizationId && resolvedOrgId) {
        // Koppel orgId aan bestaande referral. Service-functie doet de
        // conditional update — niet inline omdat we de regel "user-pages
        // / routes raken DB alleen via services" volgen.
        await attributeUserToAffiliate({
          affiliateId: existing.affiliateId,
          userId: session.user.id,
          organizationId: resolvedOrgId,
          attributionSource: existing.attributionSource ?? "url-ref",
        });
      }
    }
  }

  // ───── Discount-code validatie ─────
  // Klant kan ofwel ?ref=AFF-CODE meegeven (URL-attribution), ofwel een
  // discount-code in de form invullen (= ook attribution via discount_codes.
  // affiliateId + korting). Beide tegelijk mag.
  //
  // Tier-aware pricing: zakelijke staffel uit services/pricingTiers wordt
  // direct toegepast (5+ = -10%, 10+ = -15%, 25+ = -20%). Dat is wat de
  // prijzen-pagina belooft en wat de owner heeft gezien voor hij betaalde.
  const tier = getTierForSeats(seatCount);
  const listAmountCents = tier.pricePerSeatCents * seatCount;
  let payableAmountCents = listAmountCents;
  let resolvedDiscountId: string | null = null;
  if (discountCode) {
    const validation = await validateDiscountCode({
      code: discountCode,
      basisAmountCents: listAmountCents,
      planId: plan.id,
      seats: seatCount,
      audience: "organization",
    });
    if (!validation.success) {
      return clientError(400, validation.error, `DISCOUNT_${validation.code}`);
    }
    payableAmountCents = validation.payableAmountCents;
    resolvedDiscountId = validation.discount.id;
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
    segment: "team",
    source: "self-signup",
  }).catch(() => null);

  // Recurring plan zonder Mollie customer = geen mandate. Stop voor we de
  // user een one-off afschrijven zonder auto-renew.
  if (isRecurringPlan(plan) && !customerId) {
    return clientError(
      502,
      "Tijdelijk probleem bij onze betaalprovider. Probeer over een minuut opnieuw.",
      "MOLLIE_CUSTOMER_UNAVAILABLE",
    );
  }

  const { order, plan: planRow, amountCents, description } = await createOrder({
    userId: session.user.id,
    planSlug,
    organizationId: resolvedOrgId,
    quantity: seatCount,
    discountCodeId: resolvedDiscountId,
    amountCentsOverride: payableAmountCents,
  });

  const base = appBase();
  const fullDescription = `${description}${
    billing?.organizationName ? ` — ${billing.organizationName}` : ""
  }`;
  const redirectUrl = `${base}/checkout/success?order=${order.id}`;
  const webhookUrl = webhookUrlFor(base);
  const baseMetadata = buildMollieMetadata(
    mollieMetadataForOrder({
      order,
      plan: planRow,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      source: "self-signup",
      organization: billing
        ? {
            name: billing.organizationName,
            vatNumber: billing.vatNumber ?? null,
            countryCode: billing.countryCode ?? null,
          }
        : undefined,
    }),
  );
  const metadata: Record<string, string | number | null> = {
    ...baseMetadata,
    seats: seatCount,
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
    return clientError(502, mollie.error, mollie.code ?? "MOLLIE_FAIL");
  }

  await attachMolliePayment(
    order.id,
    mollie.data.paymentId,
    mollie.data.checkoutUrl,
  );

  return NextResponse.json({
    success: true,
    orderId: order.id,
    organizationId: resolvedOrgId,
    checkoutUrl: mollie.data.checkoutUrl,
  });
}
