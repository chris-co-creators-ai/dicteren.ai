import "server-only";
import { and, eq, inArray, ne, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authUsers,
  licenses,
  orders,
  payments,
  plans,
  subscriptions,
  userBilling,
  type Order,
  type Plan,
} from "@/lib/db/schema";
import { generateLicenseCode, hashLicenseCode } from "./license";
import { createMollieCustomer, createMollieRefund } from "./mollie";
import {
  buildMollieMetadata,
  segmentForLicenseType,
  type DiscountSnapshot,
  type LicenseSource,
  type MollieMetadataInput,
} from "./mollie-metadata";
import type { LicenseType } from "@/lib/types";

/** Days the desktop app keeps working after a recurring charge fails. */
export const PAST_DUE_GRACE_DAYS = 14;

export function periodToMonths(period: Plan["period"]): number {
  switch (period) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "yearly":
      return 12;
    case "lifetime":
      return 0;
  }
}

export function isRecurringPlan(plan: Plan): boolean {
  return plan.period !== "lifetime";
}

type CreateOrderInput = {
  userId: string;
  planSlug: string;
  organizationId?: string | null;
  quantity?: number;
  discountCodeId?: string | null;
  /** Overrule het berekende bedrag (cents). Voor checkouts met discount-code:
   *  we slaan het BETAALDE bedrag op, niet het lijst-bedrag. */
  amountCentsOverride?: number | null;
};

type CreatedOrder = {
  order: Order;
  plan: Plan;
  amountCents: number;
  /** Description for Mollie / bank statement. */
  description: string;
};

function computeAmountCents(plan: Plan, quantity: number): number {
  return plan.priceCents * Math.max(1, quantity);
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const rows = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreatedOrder> {
  const plan = await getPlanBySlug(input.planSlug);
  if (!plan) throw new Error(`Plan not found: ${input.planSlug}`);
  if (!plan.isActive) throw new Error(`Plan inactive: ${input.planSlug}`);

  const quantity = Math.max(1, input.quantity ?? 1);
  const listAmountCents = computeAmountCents(plan, quantity);
  const amountCents =
    typeof input.amountCentsOverride === "number"
      ? Math.max(0, input.amountCentsOverride)
      : listAmountCents;

  const [order] = await db
    .insert(orders)
    .values({
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      planId: plan.id,
      quantity,
      amountCents,
      currency: plan.currency,
      status: "pending",
      discountCodeId: input.discountCodeId ?? null,
    })
    .returning();

  const description = plan.isPerSeat
    ? `Dicteren.ai · ${plan.label} (${quantity} seats)`
    : `Dicteren.ai · ${plan.label}`;

  return { order, plan, amountCents, description };
}

export async function attachMolliePayment(
  orderId: string,
  paymentId: string,
  checkoutUrl: string,
): Promise<void> {
  await db
    .update(orders)
    .set({
      molliePaymentId: paymentId,
      mollieCheckoutUrl: checkoutUrl,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
}

/**
 * Fulfill a paid order: idempotent.
 *  - First call: marks paid, records payment, generates license(s).
 *  - Second call (Mollie retried): no-op, returns null.
 *
 * Per-seat model: voor een team-order met quantity=N maken we N license-rows.
 * Voor consumer-orders blijft het 1 row (seats=1, maxActivationsPerSeat=2).
 *
 * Note: neon-http driver doesn't support transactions. We rely on the
 * `licenses.code_hash` unique index and order-status check for idempotency.
 */
export async function fulfillPaidOrder(args: {
  molliePaymentId: string;
  paidAmountCents: number;
  rawWebhookPayload: unknown;
}): Promise<{
  /** Eerste license-id voor backwards-compat met affiliate-commission etc. */
  licenseId: string;
  /** Eerste license-code (consumer = enige; team = "representatie" voor email). */
  licenseCode: string;
  /** Alle license-ids (1 voor consumer, N voor team). */
  licenseIds: string[];
  /** Alle license-codes. */
  licenseCodes: string[];
  orderId: string;
  organizationId: string | null;
  userId: string | null;
  paymentId: string;
  seats: number;
  discountCodeId: string | null;
  expiresAt: Date;
  plan: Plan;
} | null> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.molliePaymentId, args.molliePaymentId))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;
  if (order.status === "paid") return null;

  // Move order to paid (will be visible immediately so retried webhooks no-op)
  const updated = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), ne(orders.status, "paid")))
    .returning({ id: orders.id });
  if (updated.length === 0) return null; // raced with another webhook

  const plan = order.planId ? (await getPlanByIdInternal(order.planId)) : null;
  if (!plan) throw new Error(`Plan missing for order ${order.id}`);

  const licenseType: LicenseType =
    plan.customerType === "organization" ? "team" : "consumer";

  const expiresAt = new Date();
  switch (plan.period) {
    case "monthly":
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      break;
    case "quarterly":
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      break;
    case "yearly":
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      break;
    case "lifetime":
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
      break;
  }

  const isTeam = licenseType === "team";
  const seatCount = isTeam ? Math.max(1, order.quantity) : 1;

  const [paymentRow] = await db
    .insert(payments)
    .values({
      orderId: order.id,
      molliePaymentId: args.molliePaymentId,
      status: "paid",
      amountCents: args.paidAmountCents,
      currency: order.currency,
      rawWebhookPayload: args.rawWebhookPayload as object,
    })
    .returning({ id: payments.id });

  const insertedIds: string[] = [];
  const insertedCodes: string[] = [];

  for (let i = 0; i < seatCount; i++) {
    const code = generateLicenseCode(licenseType);
    const codeHash = hashLicenseCode(code);
    // Eerste seat van team-order: assign aan order.userId (de owner).
    // Rest blijft unassigned tot owner ze toewijst via invite.
    const isFirstTeamSeat = isTeam && i === 0;
    const assignToUserId = isTeam ? (isFirstTeamSeat ? order.userId : null) : order.userId;
    const status = isTeam
      ? isFirstTeamSeat
        ? "active"
        : "unassigned"
      : "active";

    const [row] = await db
      .insert(licenses)
      .values({
        code,
        codeHash,
        type: licenseType,
        status,
        customerEmail: null,
        userId: assignToUserId,
        organizationId: order.organizationId,
        orderId: order.id,
        planId: plan.id,
        seats: 1,
        maxActivationsPerSeat: 2,
        assignedAt: assignToUserId ? new Date() : null,
        issuedAt: new Date(),
        expiresAt,
      })
      .returning({ id: licenses.id });
    insertedIds.push(row.id);
    insertedCodes.push(code);
  }

  return {
    licenseId: insertedIds[0],
    licenseCode: insertedCodes[0],
    licenseIds: insertedIds,
    licenseCodes: insertedCodes,
    orderId: order.id,
    organizationId: order.organizationId,
    userId: order.userId,
    paymentId: paymentRow.id,
    seats: seatCount,
    discountCodeId: order.discountCodeId ?? null,
    expiresAt,
    plan,
  };
}

/**
 * Persist a Mollie subscription row tied to a license. Idempotent on
 * mollieSubscriptionId (unique index).
 */
export async function recordSubscription(args: {
  mollieSubscriptionId: string;
  mollieCustomerId: string;
  userId: string | null;
  organizationId: string | null;
  licenseId: string;
  planId: string;
  intervalLabel: string;
  amountCents: number;
  currency: string;
  seats: number;
  nextBillingAt: Date | null;
}): Promise<void> {
  await db
    .insert(subscriptions)
    .values({
      mollieSubscriptionId: args.mollieSubscriptionId,
      mollieCustomerId: args.mollieCustomerId,
      userId: args.userId,
      organizationId: args.organizationId,
      licenseId: args.licenseId,
      planId: args.planId,
      status: "active",
      intervalLabel: args.intervalLabel,
      amountCents: args.amountCents,
      currency: args.currency,
      seats: args.seats,
      nextBillingAt: args.nextBillingAt,
    })
    .onConflictDoNothing({ target: subscriptions.mollieSubscriptionId });
}

/**
 * Recurring charge SUCCESS — bump license.expiresAt forward by 1 period,
 * restore active status (in case it was past_due), update subscription
 * nextBillingAt, record the payment.
 *
 * Per-seat model: voor team-subscriptions extenden we ALLE actieve team-
 * licenses van de gekoppelde organisatie. Voor consumer: alleen de
 * sub.licenseId-rij.
 */
export async function renewSubscriptionLicense(args: {
  mollieSubscriptionId: string;
  molliePaymentId: string;
  paidAmountCents: number;
  rawWebhookPayload: unknown;
}): Promise<{
  licenseId: string;
  newExpiresAt: Date;
  extendedCount: number;
  paymentId: string | null;
} | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.mollieSubscriptionId, args.mollieSubscriptionId))
    .limit(1);
  if (!sub) return null;

  // Plan-period bepaling: prefer sub.planId, anders via licenseId
  let plan: Plan | null = null;
  if (sub.planId) plan = await getPlanByIdInternal(sub.planId);
  if (!plan && sub.licenseId) {
    const [license] = await db
      .select({ planId: licenses.planId })
      .from(licenses)
      .where(eq(licenses.id, sub.licenseId))
      .limit(1);
    if (license?.planId) plan = await getPlanByIdInternal(license.planId);
  }
  if (!plan) return null;
  const months = periodToMonths(plan.period);
  if (months === 0) return null;

  // Bepaal target-licenses
  let targetLicenses: { id: string; expiresAt: Date | null; orderId: string | null }[] = [];

  if (sub.organizationId) {
    // Team-subscription: extend alle team-licenses van deze org die nog
    // actief / past_due / trial zijn. Revoked seats blijven revoked.
    targetLicenses = await db
      .select({
        id: licenses.id,
        expiresAt: licenses.expiresAt,
        orderId: licenses.orderId,
      })
      .from(licenses)
      .where(
        and(
          eq(licenses.organizationId, sub.organizationId),
          eq(licenses.type, "team"),
        ),
      );
  } else if (sub.licenseId) {
    const [license] = await db
      .select({
        id: licenses.id,
        expiresAt: licenses.expiresAt,
        orderId: licenses.orderId,
      })
      .from(licenses)
      .where(eq(licenses.id, sub.licenseId))
      .limit(1);
    if (license) targetLicenses = [license];
  }
  if (targetLicenses.length === 0) return null;

  // Bereken newExpiresAt op basis van de eerste (alle krijgen dezelfde).
  const first = targetLicenses[0];
  const base =
    first.expiresAt && first.expiresAt.getTime() > Date.now()
      ? new Date(first.expiresAt)
      : new Date();
  const newExpiresAt = new Date(base);
  newExpiresAt.setMonth(newExpiresAt.getMonth() + months);

  // Update alle licenses tegelijk (niet inArray over status — revoked
  // blijft staan, andere flippen naar active).
  const liveIds = targetLicenses.map((l) => l.id);
  await db
    .update(licenses)
    .set({
      status: "active",
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(licenses.id, liveIds),
        notInArray(licenses.status, ["revoked", "refunded"] as const),
      ),
    );

  await db
    .update(subscriptions)
    .set({
      status: "active",
      nextBillingAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Idempotente payment-insert. Geef de payment-uuid terug zodat de
  // renewal-commissie idempotent kan worden (guard op paymentId in
  // recordCommissionV2 voorkomt dubbele boeking bij webhook-retry).
  const existing = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.molliePaymentId, args.molliePaymentId))
    .limit(1);
  let paymentId: string | null = existing[0]?.id ?? null;
  if (!existing[0]) {
    const anyOrderId = targetLicenses.find((l) => l.orderId)?.orderId ?? null;
    if (anyOrderId) {
      const [ins] = await db
        .insert(payments)
        .values({
          orderId: anyOrderId,
          molliePaymentId: args.molliePaymentId,
          status: "paid",
          amountCents: args.paidAmountCents,
          currency: sub.currency,
          rawWebhookPayload: args.rawWebhookPayload as object,
        })
        .onConflictDoNothing({ target: payments.molliePaymentId })
        .returning({ id: payments.id });
      paymentId = ins?.id ?? null;
      // Race: een parallelle webhook insertte 'm net. Haal de uuid op.
      if (!paymentId) {
        const [again] = await db
          .select({ id: payments.id })
          .from(payments)
          .where(eq(payments.molliePaymentId, args.molliePaymentId))
          .limit(1);
        paymentId = again?.id ?? null;
      }
    }
  }

  return {
    licenseId: first.id,
    newExpiresAt,
    extendedCount: targetLicenses.length,
    paymentId,
  };
}

/**
 * Recurring charge FAILED — flip license to past_due with a 14-day grace from
 * NOW so the desktop keeps working while Mollie retries / user updates billing.
 * Grace never shortens an already-longer expiresAt.
 */
export async function markSubscriptionPastDue(args: {
  mollieSubscriptionId: string;
}): Promise<{ licenseId: string; graceUntil: Date } | null> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.mollieSubscriptionId, args.mollieSubscriptionId))
    .limit(1);
  if (!sub || !sub.licenseId) return null;

  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, sub.licenseId))
    .limit(1);
  if (!license) return null;
  // Already refunded/revoked overrides past_due (those are terminal).
  if (license.status === "refunded" || license.status === "revoked") return null;

  const graceUntil = new Date();
  graceUntil.setDate(graceUntil.getDate() + PAST_DUE_GRACE_DAYS);
  const newExpiresAt =
    license.expiresAt && license.expiresAt.getTime() > graceUntil.getTime()
      ? license.expiresAt
      : graceUntil;

  await db
    .update(licenses)
    .set({
      status: "past_due",
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, license.id));

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  return { licenseId: license.id, graceUntil: newExpiresAt };
}

/** Look up subscription + license by Mollie subscription id. */
export async function getSubscriptionByMollieId(mollieSubscriptionId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.mollieSubscriptionId, mollieSubscriptionId))
    .limit(1);
  return sub ?? null;
}

async function getPlanByIdInternal(id: string): Promise<Plan | null> {
  const rows = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Mark order based on Mollie status.
 *
 * Rules:
 *  - `failed` / `canceled` → only applied to orders that aren't already paid
 *    (a webhook should never demote a paid order).
 *  - `refunded` → only applied to orders that ARE paid (Mollie can only refund
 *    paid payments).
 */
export async function markOrderStatus(
  molliePaymentId: string,
  status: "failed" | "canceled" | "refunded",
): Promise<void> {
  const guard =
    status === "refunded"
      ? eq(orders.status, "paid")
      : ne(orders.status, "paid");

  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(orders.molliePaymentId, molliePaymentId), guard));

  if (status === "refunded") {
    const orderRow = (
      await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.molliePaymentId, molliePaymentId))
        .limit(1)
    )[0];
    if (orderRow) {
      await db
        .update(licenses)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(licenses.orderId, orderRow.id));
    }
  }
}

export async function ensureMollieCustomerId(args: {
  userId: string;
  name: string;
  email: string;
  /** Default "consumer"; checkout/organization route overschrijft naar "team". */
  segment?: "consumer" | "team";
  /** Default "self-signup"; admin-grant of partner kunnen overschrijven. */
  source?: LicenseSource;
}): Promise<string | null> {
  const existingRows = await db
    .select()
    .from(userBilling)
    .where(eq(userBilling.userId, args.userId))
    .limit(1);
  const existing = existingRows[0];
  if (existing?.mollieCustomerId) return existing.mollieCustomerId;

  const segment = args.segment ?? "consumer";
  const source = args.source ?? "self-signup";

  // Mollie customer met standaard metadata-schema (zie mollie-metadata.ts).
  // licenseType + period zijn placeholders — bij eerste order wordt het echte
  // payment/subscription opnieuw met juiste metadata aangemaakt.
  const created = await createMollieCustomer({
    name: args.name,
    email: args.email,
    metadata: {
      userId: args.userId,
      segment,
      source,
      // op customer-niveau weten we plan nog niet, zetten "unknown" zodat
      // de filter-key tenminste bestaat.
      licenseType: segment === "team" ? "team" : "consumer",
      period: "unknown",
    },
  });
  if (!created.success) return null;
  const customerId = created.data.customerId;

  await db
    .insert(userBilling)
    .values({
      userId: args.userId,
      mollieCustomerId: customerId,
      billingEmail: args.email,
    })
    .onConflictDoUpdate({
      target: userBilling.userId,
      set: { mollieCustomerId: customerId, updatedAt: new Date() },
    });

  return customerId;
}

/** Bouwt het Mollie-metadata object voor een payment/subscription op basis
 *  van een order + plan + user-context. Centraal zodat alle checkout-routes
 *  en webhook hetzelfde schema produceren. */
export function mollieMetadataForOrder(args: {
  order: Order;
  plan: Plan;
  user: { id: string; email: string; name: string };
  source?: LicenseSource;
  discount?: DiscountSnapshot;
  /** Voor B2B-orders: organisatiegegevens worden gespiegeld naar Mollie-metadata
   *  zodat het dashboard meteen company/VAT laat zien. */
  organization?: {
    name?: string | null;
    vatNumber?: string | null;
    countryCode?: string | null;
  };
}): MollieMetadataInput {
  const licenseType: LicenseType =
    args.plan.customerType === "organization" ? "team" : "consumer";
  return {
    userId: args.user.id,
    segment: segmentForLicenseType(licenseType),
    source: args.source ?? "self-signup",
    licenseType,
    period: args.plan.period,
    internalRef: args.order.id,
    discount: args.discount ?? null,
    organizationId: args.order.organizationId,
    email: args.user.email,
    name: args.user.name,
    organizationName: args.organization?.name ?? null,
    vatNumber: args.organization?.vatNumber ?? null,
    countryCode: args.organization?.countryCode ?? null,
  };
}

/** Update license-row met discount + source na issue. Idempotent — als er al
 *  een discount-record staat (bv. door admin-grant), niet overschrijven. */
export async function recordLicenseDiscount(args: {
  licenseId: string;
  source: LicenseSource;
  discount: DiscountSnapshot;
}): Promise<void> {
  await db
    .update(licenses)
    .set({
      source: args.source,
      discountType: args.discount?.type ?? null,
      discountValue: args.discount?.value ?? null,
      updatedAt: new Date(),
    })
    .where(eq(licenses.id, args.licenseId));
}

/** Lookup user-billing (mollieCustomerId + billing-email) voor één user. */
export async function getUserBilling(userId: string): Promise<{
  mollieCustomerId: string | null;
  billingEmail: string | null;
} | null> {
  const [row] = await db
    .select({
      mollieCustomerId: userBilling.mollieCustomerId,
      billingEmail: userBilling.billingEmail,
    })
    .from(userBilling)
    .where(eq(userBilling.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Admin-initiated refund.
 *  - Validatie: order moet status="paid" zijn én een molliePaymentId hebben.
 *  - Mollie POST /payments/{id}/refunds → refund start (status queued/pending).
 *  - Onze license + order status wordt NIET hier omgezet; dat doet de webhook
 *    bij definitieve refund-bevestiging (idempotent, single source of truth).
 *  - Audit-log met actorId en bedrag voor traceability.
 */
export async function refundOrder(args: {
  orderId: string;
  actorUserId: string;
  /** Cents. Weglaten = volledig. */
  amountCents?: number;
  description?: string;
}): Promise<
  | { success: true; refundId: string; status: string; amountCents: number }
  | { success: false; error: string; code: string }
> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, args.orderId))
    .limit(1);
  if (!order) {
    return { success: false, error: "Order niet gevonden", code: "NOT_FOUND" };
  }
  if (!order.molliePaymentId) {
    return {
      success: false,
      error: "Order heeft geen Mollie payment-id (admin-grant?)",
      code: "NO_PAYMENT_ID",
    };
  }
  if (order.status !== "paid") {
    return {
      success: false,
      error: `Order is niet betaald (status=${order.status}); refund niet mogelijk.`,
      code: "NOT_PAID",
    };
  }

  const result = await createMollieRefund({
    paymentId: order.molliePaymentId,
    amountCents: args.amountCents,
    currency: order.currency,
    description: args.description,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.code ?? "MOLLIE_REFUND_FAILED",
    };
  }

  return {
    success: true,
    refundId: result.data.refundId,
    status: result.data.status,
    amountCents: result.data.amountCents,
  };
}

/** Composite receipt-view voor /checkout/success. Ownership-check ingebakken:
 *  als de order niet van deze user is, returnt deze functie null en moet de
 *  caller redirecten naar "/". */
export type CheckoutReceipt = {
  order: Pick<
    Order,
    "id" | "status" | "amountCents" | "currency" | "userId"
  >;
  plan: Pick<Plan, "label" | "period"> | null;
  license: {
    code: string;
    status: string;
    seats: number;
    maxActivationsPerSeat: number;
    expiresAt: Date | null;
  } | null;
  buyer: { email: string | null; name: string | null } | null;
};

export async function getCheckoutReceipt(
  orderId: string,
  userId: string,
): Promise<CheckoutReceipt | null> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const order = orderRows[0];
  if (!order || order.userId !== userId) return null;

  const [plan, license, buyer] = await Promise.all([
    order.planId
      ? db
          .select({ label: plans.label, period: plans.period })
          .from(plans)
          .where(eq(plans.id, order.planId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select({
        code: licenses.code,
        status: licenses.status,
        seats: licenses.seats,
        maxActivationsPerSeat: licenses.maxActivationsPerSeat,
        expiresAt: licenses.expiresAt,
      })
      .from(licenses)
      .where(eq(licenses.orderId, order.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    order.userId
      ? db
          .select({ email: authUsers.email, name: authUsers.name })
          .from(authUsers)
          .where(eq(authUsers.id, order.userId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    order: {
      id: order.id,
      status: order.status,
      amountCents: order.amountCents,
      currency: order.currency,
      userId: order.userId,
    },
    plan,
    license,
    buyer,
  };
}
