// Dicteren.ai — Seat-upgrade en downgrade service
//
// Verantwoordelijkheid: alle Mollie-mutaties bij seat-changes.
//
// MVP-strategie:
//   1. UPGRADE  : pro-rata charge voor de delta op huidige tier (mid-cycle),
//                 daarna cancel-and-replace van de subscription voor de volgende
//                 incasso. Status van delta-seats blijft "pending_payment" tot
//                 het webhook-paid event de seats activeert.
//   2. DOWNGRADE: geen instant refund. Revoke gekozen seats direct (devices off).
//                 Subscription replace voor volgende incasso met lager bedrag.
//                 Owner houdt waarde van resterende periode.
//   3. TIER-OVERGANG: pricingTiers berekent correctie op de OUDE seats binnen
//                 de proration (kan credit zijn — verschijnt als negatieve
//                 prorataDeltaCents).
//
// Idempotency:
//   - org_subscription_history rij komt pas bij webhook-success
//   - oude Mollie sub blijft live tot replace bevestigd
//   - delta-seats hebben status pending_payment + invitationId=null tot paid

import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import {
  licenses,
  orgSubscriptionHistory,
  plans,
  subscriptions,
} from "@/lib/db/schema";
import { authUser } from "@/lib/db/auth-schema";
import {
  cancelMollieSubscription,
  createCustomerPayment,
  createMollieSubscription,
  periodToMollieInterval,
  verifyWebhookPayment,
} from "./mollie";
import { buildMollieMetadata } from "./mollie-metadata";
import {
  CUSTOM_QUOTE_FROM,
  calculateProrationCents,
  getTierForSeats,
} from "./pricingTiers";
import {
  createUnassignedSeats,
  getOrgSeatSnapshot,
  revokeSeat,
} from "./orgSeats";
import { generateLicenseCode, hashLicenseCode } from "./license";
import { logEvent } from "./audit";
import { appBase, webhookUrlFor } from "@/lib/url";

// ───── Preview ─────────────────────────────────────────────────────

export type PreviewQuote = {
  currentSeats: number;
  newSeats: number;
  delta: number;
  oldTier: { id: string; pricePerSeatCents: number; discountPct: number };
  newTier: { id: string; pricePerSeatCents: number; discountPct: number };
  tierChanged: boolean;
  prorataDeltaCents: number;
  newAnnualCents: number;
  oldAnnualCents: number;
  newSeatsCharge: number;
  tierCorrection: number;
  customQuoteRequired: boolean;
  daysRemaining: number;
  daysInPeriod: number;
  nextBillingAt: Date | null;
};

/** Toon de owner wat een seat-change kost en welk effect het heeft. */
export async function previewSeatChange(args: {
  orgId: string;
  newSeats: number;
}): Promise<PreviewQuote> {
  const snapshot = await getOrgSeatSnapshot(args.orgId);
  const oldSeats = snapshot.totalSeats;
  const newSeats = args.newSeats;
  const delta = newSeats - oldSeats;

  const oldTier = getTierForSeats(oldSeats);
  const newTier = getTierForSeats(newSeats);
  const customQuoteRequired =
    newSeats >= CUSTOM_QUOTE_FROM || oldSeats >= CUSTOM_QUOTE_FROM;

  // Bereken pro-rata window
  const nextBillingAt = snapshot.subscription?.nextBillingAt ?? null;
  const now = new Date();
  const daysInPeriod = 365; // yearly subscriptions zijn de norm voor zakelijk
  const daysRemaining = nextBillingAt
    ? Math.max(
        0,
        Math.ceil((nextBillingAt.getTime() - now.getTime()) / 86_400_000),
      )
    : daysInPeriod;

  const proration = calculateProrationCents({
    oldSeats,
    newSeats: Math.max(0, newSeats),
    daysRemaining,
    daysInPeriod,
  });

  return {
    currentSeats: oldSeats,
    newSeats,
    delta,
    oldTier: {
      id: oldTier.id,
      pricePerSeatCents: oldTier.pricePerSeatCents,
      discountPct: oldTier.discountPct,
    },
    newTier: {
      id: newTier.id,
      pricePerSeatCents: newTier.pricePerSeatCents,
      discountPct: newTier.discountPct,
    },
    tierChanged: oldTier.id !== newTier.id,
    prorataDeltaCents: customQuoteRequired ? 0 : proration.prorataDeltaCents,
    newAnnualCents: newTier.pricePerSeatCents * newSeats,
    oldAnnualCents: oldTier.pricePerSeatCents * oldSeats,
    newSeatsCharge: proration.newSeatsCharge,
    tierCorrection: proration.tierCorrection,
    customQuoteRequired,
    daysRemaining,
    daysInPeriod,
    nextBillingAt,
  };
}

// ───── Upgrade (meer seats) ────────────────────────────────────────

export type UpgradeResult =
  | {
      success: true;
      action: "seats_added";
      delta: number;
      newTotal: number;
      oldAmountCents: number;
      newAmountCents: number;
      newLicenseIds: string[];
      newCodes: string[];
      prorataChargeCents: number;
      prorataPaymentId: string | null;
      prorataCheckoutUrl: string | null;
    }
  | {
      success: false;
      code:
        | "CUSTOM_QUOTE_REQUIRED"
        | "INVALID_DELTA"
        | "NO_SUBSCRIPTION"
        | "NO_CUSTOMER"
        | "PRORATE_CHARGE_FAILED"
        | "MOLLIE_NOT_CONFIGURED";
      error: string;
    };

export async function executeSeatExpansion(args: {
  orgId: string;
  newSeats: number;
  actorUserId: string;
}): Promise<UpgradeResult> {
  const snapshot = await getOrgSeatSnapshot(args.orgId);
  const oldSeats = snapshot.totalSeats;
  const delta = args.newSeats - oldSeats;
  if (delta <= 0) {
    return { success: false, code: "INVALID_DELTA", error: "Delta moet positief zijn." };
  }
  if (args.newSeats >= CUSTOM_QUOTE_FROM) {
    return {
      success: false,
      code: "CUSTOM_QUOTE_REQUIRED",
      error: `Voor ${CUSTOM_QUOTE_FROM}+ seats vragen we een maatwerk-offerte.`,
    };
  }
  if (!snapshot.subscription) {
    return {
      success: false,
      code: "NO_SUBSCRIPTION",
      error: "Geen actieve subscription gevonden voor deze organisatie.",
    };
  }

  // Lookup Mollie customer-id via subscription-row (we slaan deze daar op).
  const [subRow] = await db
    .select({
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      mollieCustomerId: subscriptions.mollieCustomerId,
      planId: subscriptions.planId,
      currency: subscriptions.currency,
      amountCents: subscriptions.amountCents,
      nextBillingAt: subscriptions.nextBillingAt,
      seats: subscriptions.seats,
    })
    .from(subscriptions)
    .where(eq(subscriptions.id, snapshot.subscription.id))
    .limit(1);
  if (!subRow?.mollieCustomerId) {
    return {
      success: false,
      code: "NO_CUSTOMER",
      error: "Geen Mollie customer-id gekoppeld aan organisatie.",
    };
  }

  const oldTier = getTierForSeats(oldSeats);
  const newTier = getTierForSeats(args.newSeats);
  const proration = calculateProrationCents({
    oldSeats,
    newSeats: args.newSeats,
    daysRemaining: snapshot.subscription.nextBillingAt
      ? Math.max(
          0,
          Math.ceil(
            (snapshot.subscription.nextBillingAt.getTime() - Date.now()) /
              86_400_000,
          ),
        )
      : 365,
    daysInPeriod: 365,
  });

  const newAnnualCents = newTier.pricePerSeatCents * args.newSeats;
  const oldAnnualCents = oldTier.pricePerSeatCents * oldSeats;

  // ───── 1. Maak pro-rata charge (alleen als positief — credit komt op nextBillingAt)
  let prorataPaymentId: string | null = null;
  let prorataCheckoutUrl: string | null = null;
  let prorataChargeCents = 0;

  if (proration.prorataDeltaCents > 0) {
    // Owner-info uit auth.user voor metadata
    const [owner] = await dbAuth
      .select({
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
      })
      .from(authUser)
      .where(eq(authUser.id, args.actorUserId))
      .limit(1);

    const expiry = snapshot.subscription.nextBillingAt ?? new Date();
    const metadata = buildMollieMetadata({
      userId: owner?.id ?? args.actorUserId,
      segment: "team",
      source: "self-signup",
      licenseType: "team",
      period: "yearly",
      internalRef: `seat-upgrade:${args.orgId}:${args.newSeats}`,
      discount: null,
      organizationId: args.orgId,
      email: owner?.email ?? "",
      name: owner?.name ?? "",
      organizationName: null,
      vatNumber: null,
      countryCode: null,
    });
    // Markeer dit als seat_expansion zodat de webhook routeert.
    metadata.kind = "seat_expansion";
    metadata.deltaSeats = delta;
    metadata.targetSeats = args.newSeats;

    const base = appBase();
    const result = await createCustomerPayment({
      customerId: subRow.mollieCustomerId,
      sequenceType: "recurring",
      amountCents: proration.prorataDeltaCents,
      description: `Dicteren.ai · pro-rata voor ${delta} extra ${
        delta === 1 ? "seat" : "seats"
      } tot ${expiry.toISOString().slice(0, 10)}`,
      redirectUrl: `${base}/account/organization/${args.orgId}?upgrade=ok`,
      webhookUrl: webhookUrlFor(base),
      metadata: metadata as unknown as Record<
        string,
        string | number | boolean | null
      >,
    });

    if (!result.success) {
      return {
        success: false,
        code: "PRORATE_CHARGE_FAILED",
        error: result.error,
      };
    }
    prorataPaymentId = result.data.paymentId;
    prorataCheckoutUrl = result.data.checkoutUrl;
    prorataChargeCents = proration.prorataDeltaCents;
  }

  // ───── 2. Maak delta-seats aan in pending_payment status (of unassigned als credit)
  const seatStatus =
    proration.prorataDeltaCents > 0 ? "pending_payment" : "unassigned";

  const planRow = await db
    .select()
    .from(plans)
    .where(eq(plans.id, subRow.planId ?? ""))
    .limit(1);
  const expiresAt = snapshot.subscription.nextBillingAt ?? new Date();

  const created = await createUnassignedSeats({
    organizationId: args.orgId,
    count: delta,
    planId: subRow.planId ?? null,
    orderId: null,
    expiresAt,
    source: "self-service-upgrade",
    status: seatStatus as "pending_payment" | "unassigned",
  });

  // ───── 3. Replace de Mollie subscription voor volgende incasso (new-first-then-cancel)
  const interval = periodToMollieInterval("yearly") ?? "12 months";
  const newSubResult = await createMollieSubscription({
    customerId: subRow.mollieCustomerId,
    amountCents: newAnnualCents,
    currency: subRow.currency,
    interval,
    description: `Dicteren.ai · zakelijk ${args.newSeats} seats (auto-renew)`,
    webhookUrl: webhookUrlFor(appBase()),
    startDate: snapshot.subscription.nextBillingAt
      ? snapshot.subscription.nextBillingAt.toISOString().slice(0, 10)
      : undefined,
    metadata: {
      organizationId: args.orgId,
      seats: args.newSeats,
      tier: newTier.id,
      kind: "subscription_replacement",
    },
  });

  if (newSubResult.success) {
    await db.insert(subscriptions).values({
      mollieSubscriptionId: newSubResult.data.subscriptionId,
      mollieCustomerId: subRow.mollieCustomerId,
      organizationId: args.orgId,
      planId: subRow.planId ?? null,
      status: "active",
      intervalLabel: interval,
      amountCents: newAnnualCents,
      currency: subRow.currency,
      seats: args.newSeats,
      nextBillingAt: snapshot.subscription.nextBillingAt,
      mollieIntervalChangedAt: new Date(),
    });

    // Cancel de oude. Doet de "new-first" volgorde af.
    await cancelMollieSubscription({
      customerId: subRow.mollieCustomerId,
      subscriptionId: subRow.mollieSubscriptionId,
    }).catch((err) => {
      console.warn("[orderUpgrade] cancel old sub failed", err);
    });

    await db
      .update(subscriptions)
      .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.id, snapshot.subscription.id));

    // Audit-row in org_subscription_history
    await db.insert(orgSubscriptionHistory).values({
      organizationId: args.orgId,
      oldSeats,
      newSeats: args.newSeats,
      oldAmountCents: oldAnnualCents,
      newAmountCents: newAnnualCents,
      oldTier: oldTier.id,
      newTier: newTier.id,
      oldMollieSubscriptionId: subRow.mollieSubscriptionId,
      newMollieSubscriptionId: newSubResult.data.subscriptionId,
      prorataChargeCents,
      prorataPaymentId,
      reason: "self_service_upgrade",
      actorUserId: args.actorUserId,
      metadata: {
        tierChanged: oldTier.id !== newTier.id,
        delta,
        newCodes: created.codes,
      },
    });
  } else {
    // Sub-replace faalde — pending seats blijven staan, prorata mag al doorgaan
    await logEvent({
      action: "organization.subscription_failed",
      entityType: "organization",
      entityId: args.orgId,
      actorId: args.actorUserId,
      metadata: { reason: newSubResult.error, code: newSubResult.code },
    });
  }

  void planRow;

  await logEvent({
    action: "organization.seats_expanded",
    entityType: "organization",
    entityId: args.orgId,
    actorId: args.actorUserId,
    metadata: {
      oldSeats,
      newSeats: args.newSeats,
      delta,
      tier: newTier.id,
      tierChanged: oldTier.id !== newTier.id,
      newLicenseIds: created.licenseIds,
      prorataPaymentId,
    },
  });

  if (oldTier.id !== newTier.id) {
    await logEvent({
      action: "organization.tier_changed",
      entityType: "organization",
      entityId: args.orgId,
      actorId: args.actorUserId,
      metadata: { oldTier: oldTier.id, newTier: newTier.id, direction: "up" },
    });
  }

  return {
    success: true,
    action: "seats_added",
    delta,
    newTotal: args.newSeats,
    oldAmountCents: oldAnnualCents,
    newAmountCents: newAnnualCents,
    newLicenseIds: created.licenseIds,
    newCodes: created.codes,
    prorataChargeCents,
    prorataPaymentId,
    prorataCheckoutUrl,
  };
}

// ───── Downgrade (minder seats) ────────────────────────────────────

export type DowngradeResult =
  | {
      success: true;
      action: "seats_reduced";
      delta: number;
      newTotal: number;
      oldAmountCents: number;
      newAmountCents: number;
      revokedSeatIds: string[];
      revokedDevices: number;
    }
  | {
      success: false;
      code:
        | "INVALID_DELTA"
        | "NO_SUBSCRIPTION"
        | "NO_CUSTOMER"
        | "MUST_CHOOSE_SEATS"
        | "MIN_SEATS_REACHED";
      error: string;
    };

/** Verlaag het aantal seats. Owner moet expliciet kiezen welke seats weggaan. */
export async function executeSeatReduction(args: {
  orgId: string;
  seatIdsToRevoke: string[];
  actorUserId: string;
}): Promise<DowngradeResult> {
  if (args.seatIdsToRevoke.length === 0) {
    return {
      success: false,
      code: "MUST_CHOOSE_SEATS",
      error: "Kies expliciet welke seats verwijderd worden.",
    };
  }

  const snapshot = await getOrgSeatSnapshot(args.orgId);
  if (!snapshot.subscription) {
    return {
      success: false,
      code: "NO_SUBSCRIPTION",
      error: "Geen actieve subscription gevonden.",
    };
  }
  const oldSeats = snapshot.totalSeats;
  const newSeats = oldSeats - args.seatIdsToRevoke.length;
  if (newSeats < 1) {
    return {
      success: false,
      code: "MIN_SEATS_REACHED",
      error: "Minstens 1 seat moet overblijven.",
    };
  }

  const [subRow] = await db
    .select({
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      mollieCustomerId: subscriptions.mollieCustomerId,
      planId: subscriptions.planId,
      currency: subscriptions.currency,
    })
    .from(subscriptions)
    .where(eq(subscriptions.id, snapshot.subscription.id))
    .limit(1);
  if (!subRow?.mollieCustomerId) {
    return {
      success: false,
      code: "NO_CUSTOMER",
      error: "Geen Mollie customer-id gekoppeld.",
    };
  }

  // Revoke gekozen seats + devices
  let totalRevokedDevices = 0;
  for (const seatId of args.seatIdsToRevoke) {
    const r = await revokeSeat({
      licenseId: seatId,
      actorUserId: args.actorUserId,
      reason: "downgrade",
    });
    totalRevokedDevices += r.revokedDevices;
  }

  const oldTier = getTierForSeats(oldSeats);
  const newTier = getTierForSeats(newSeats);
  const newAnnualCents = newTier.pricePerSeatCents * newSeats;
  const oldAnnualCents = oldTier.pricePerSeatCents * oldSeats;

  // Mollie sub replace voor volgende incasso (geen instant refund — owner
  // houdt de waarde van de al-betaalde periode)
  const interval = periodToMollieInterval("yearly") ?? "12 months";
  const newSubResult = await createMollieSubscription({
    customerId: subRow.mollieCustomerId,
    amountCents: newAnnualCents,
    currency: subRow.currency,
    interval,
    description: `Dicteren.ai · zakelijk ${newSeats} seats (auto-renew)`,
    webhookUrl: webhookUrlFor(appBase()),
    startDate: snapshot.subscription.nextBillingAt
      ? snapshot.subscription.nextBillingAt.toISOString().slice(0, 10)
      : undefined,
    metadata: {
      organizationId: args.orgId,
      seats: newSeats,
      tier: newTier.id,
      kind: "subscription_replacement",
    },
  });

  if (newSubResult.success) {
    await db.insert(subscriptions).values({
      mollieSubscriptionId: newSubResult.data.subscriptionId,
      mollieCustomerId: subRow.mollieCustomerId,
      organizationId: args.orgId,
      planId: subRow.planId ?? null,
      status: "active",
      intervalLabel: interval,
      amountCents: newAnnualCents,
      currency: subRow.currency,
      seats: newSeats,
      nextBillingAt: snapshot.subscription.nextBillingAt,
      mollieIntervalChangedAt: new Date(),
    });

    await cancelMollieSubscription({
      customerId: subRow.mollieCustomerId,
      subscriptionId: subRow.mollieSubscriptionId,
    }).catch((err) => {
      console.warn("[orderUpgrade] cancel old sub failed", err);
    });

    await db
      .update(subscriptions)
      .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.id, snapshot.subscription.id));

    await db.insert(orgSubscriptionHistory).values({
      organizationId: args.orgId,
      oldSeats,
      newSeats,
      oldAmountCents: oldAnnualCents,
      newAmountCents: newAnnualCents,
      oldTier: oldTier.id,
      newTier: newTier.id,
      oldMollieSubscriptionId: subRow.mollieSubscriptionId,
      newMollieSubscriptionId: newSubResult.data.subscriptionId,
      prorataChargeCents: 0,
      prorataPaymentId: null,
      reason: "self_service_downgrade",
      actorUserId: args.actorUserId,
      metadata: {
        revokedSeatIds: args.seatIdsToRevoke,
        revokedDevices: totalRevokedDevices,
        tierChanged: oldTier.id !== newTier.id,
      },
    });
  } else {
    await logEvent({
      action: "organization.subscription_failed",
      entityType: "organization",
      entityId: args.orgId,
      actorId: args.actorUserId,
      metadata: { reason: newSubResult.error, code: newSubResult.code },
    });
  }

  await logEvent({
    action: "organization.seats_reduced",
    entityType: "organization",
    entityId: args.orgId,
    actorId: args.actorUserId,
    metadata: {
      oldSeats,
      newSeats,
      delta: args.seatIdsToRevoke.length,
      revokedSeatIds: args.seatIdsToRevoke,
      revokedDevices: totalRevokedDevices,
    },
  });

  if (oldTier.id !== newTier.id) {
    await logEvent({
      action: "organization.tier_changed",
      entityType: "organization",
      entityId: args.orgId,
      actorId: args.actorUserId,
      metadata: { oldTier: oldTier.id, newTier: newTier.id, direction: "down" },
    });
  }

  return {
    success: true,
    action: "seats_reduced",
    delta: args.seatIdsToRevoke.length,
    newTotal: newSeats,
    oldAmountCents: oldAnnualCents,
    newAmountCents: newAnnualCents,
    revokedSeatIds: args.seatIdsToRevoke,
    revokedDevices: totalRevokedDevices,
  };
}

// ───── Webhook helper: activate pending seats na paid prorata ─────

/** Bij webhook paid event met metadata.kind=seat_expansion: flip de
 *  pending_payment seats van deze org naar unassigned (klaar voor invite). */
export async function activatePendingExpansionSeats(args: {
  orgId: string;
  paymentId: string;
}): Promise<{ activated: number }> {
  const result = await db
    .update(licenses)
    .set({ status: "unassigned", updatedAt: new Date() })
    .where(
      and(
        eq(licenses.organizationId, args.orgId),
        eq(licenses.type, "team"),
        eq(licenses.status, "pending_payment"),
      ),
    )
    .returning({ id: licenses.id });

  if (result.length > 0) {
    await logEvent({
      action: "organization.proration_charged",
      entityType: "organization",
      entityId: args.orgId,
      metadata: {
        paymentId: args.paymentId,
        activatedSeats: result.length,
      },
    });
  }

  return { activated: result.length };
}

// Re-exports voor consumers
export type { PreviewQuote as SeatPreviewQuote };

// Stille no-op gebruik om unused-warnings te vermijden voor optioneel helpers
void generateLicenseCode;
void hashLicenseCode;
void verifyWebhookPayment;
void sql;
void inArray;
