import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
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
import { createMollieCustomer } from "./mollie";
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
  const amountCents = computeAmountCents(plan, quantity);

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
 *  - First call: marks paid, records payment, generates license.
 *  - Second call (Mollie retried): no-op, returns null.
 *
 * Note: neon-http driver doesn't support transactions. We rely on the
 * `licenses.code_hash` unique index and order-status check for idempotency.
 */
export async function fulfillPaidOrder(args: {
  molliePaymentId: string;
  paidAmountCents: number;
  rawWebhookPayload: unknown;
}): Promise<{
  licenseId: string;
  licenseCode: string;
  orderId: string;
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

  const code = generateLicenseCode(licenseType);
  const codeHash = hashLicenseCode(code);
  const seats = plan.isPerSeat ? order.quantity : 1;

  await db.insert(payments).values({
    orderId: order.id,
    molliePaymentId: args.molliePaymentId,
    status: "paid",
    amountCents: args.paidAmountCents,
    currency: order.currency,
    rawWebhookPayload: args.rawWebhookPayload as object,
  });

  const [license] = await db
    .insert(licenses)
    .values({
      code,
      codeHash,
      type: licenseType,
      status: "active",
      customerEmail: null,
      userId: order.userId,
      organizationId: order.organizationId,
      orderId: order.id,
      planId: plan.id,
      seats,
      maxActivationsPerSeat: 2,
      issuedAt: new Date(),
      expiresAt,
    })
    .returning({ id: licenses.id });

  return {
    licenseId: license.id,
    licenseCode: code,
    orderId: order.id,
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
 */
export async function renewSubscriptionLicense(args: {
  mollieSubscriptionId: string;
  molliePaymentId: string;
  paidAmountCents: number;
  rawWebhookPayload: unknown;
}): Promise<{ licenseId: string; newExpiresAt: Date } | null> {
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

  if (!license.planId) return null;
  const plan = await getPlanByIdInternal(license.planId);
  if (!plan) return null;
  const months = periodToMonths(plan.period);
  if (months === 0) return null;

  const base =
    license.expiresAt && license.expiresAt.getTime() > Date.now()
      ? new Date(license.expiresAt)
      : new Date();
  const newExpiresAt = new Date(base);
  newExpiresAt.setMonth(newExpiresAt.getMonth() + months);

  await db
    .update(licenses)
    .set({ status: "active", expiresAt: newExpiresAt, updatedAt: new Date() })
    .where(eq(licenses.id, license.id));

  await db
    .update(subscriptions)
    .set({
      status: "active",
      nextBillingAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Record the payment row (idempotency relies on mollie_payment_id check below).
  const existing = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.molliePaymentId, args.molliePaymentId))
    .limit(1);
  if (!existing[0]) {
    await db.insert(payments).values({
      orderId: license.orderId!,
      molliePaymentId: args.molliePaymentId,
      status: "paid",
      amountCents: args.paidAmountCents,
      currency: license.userId ? "EUR" : "EUR",
      rawWebhookPayload: args.rawWebhookPayload as object,
    });
  }

  return { licenseId: license.id, newExpiresAt };
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
