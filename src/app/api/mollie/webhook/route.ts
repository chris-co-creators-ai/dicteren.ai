// Dicteren.ai — Mollie Webhook
//
// Action layer:
//  1. Mollie POSTs { id: "tr_xxx" } (form / json / query — all accepted).
//  2. We GET /v2/payments/{id} for authoritative status (never trust body).
//  3. Route by payment kind:
//       - first / one-off paid    → fulfillPaidOrder → optional subscription
//       - recurring paid          → renewSubscriptionLicense
//       - recurring failed        → markSubscriptionPastDue (14-day grace)
//       - one-off failed/canceled → markOrderStatus
//       - refunded                → markOrderStatus + lock license
//
// All paths are idempotent: fulfillPaidOrder uses status-guarded UPDATE,
// renew checks payments-unique, recordSubscription has unique index on
// mollieSubscriptionId.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers, licenses, orders, userBilling } from "@/lib/db/schema";
import {
  createMollieSubscription,
  mapMollieStatus,
  periodToMollieInterval,
  verifyWebhookPayment,
} from "@/lib/services/mollie";
import {
  fulfillPaidOrder,
  isRecurringPlan,
  markOrderStatus,
  markSubscriptionPastDue,
  recordSubscription,
  renewSubscriptionLicense,
} from "@/lib/services/order";
import { logEvent, trackEvent } from "@/lib/services/audit";
import {
  sendLicenseEmail,
  sendPastDueEmail,
  sendRefundEmail,
  sendRenewalEmail,
} from "@/lib/services/email";

/** Lookup billing contact by license-id (used for recurring/refund mails). */
async function contactForLicense(
  licenseId: string,
): Promise<{ email: string; name: string; userId: string | null } | null> {
  const [row] = await db
    .select({
      email: authUsers.email,
      name: authUsers.name,
      userId: licenses.userId,
    })
    .from(licenses)
    .leftJoin(authUsers, eq(licenses.userId, authUsers.id))
    .where(eq(licenses.id, licenseId))
    .limit(1);
  if (!row?.email) return null;
  return { email: row.email, name: row.name ?? "", userId: row.userId };
}

/** Lookup billing contact by mollie payment id (used for refund of one-off). */
async function contactForPayment(
  molliePaymentId: string,
): Promise<{
  email: string;
  name: string;
  orderId: string;
  userId: string | null;
} | null> {
  const [row] = await db
    .select({
      email: authUsers.email,
      name: authUsers.name,
      orderId: orders.id,
      userId: orders.userId,
    })
    .from(orders)
    .leftJoin(authUsers, eq(orders.userId, authUsers.id))
    .where(eq(orders.molliePaymentId, molliePaymentId))
    .limit(1);
  if (!row?.email) return null;
  return {
    email: row.email,
    name: row.name ?? "",
    orderId: row.orderId,
    userId: row.userId,
  };
}

function appBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function webhookUrlFor(base: string): string | undefined {
  if (/localhost|127\.0\.0\.1/.test(base)) return undefined;
  return `${base}/api/mollie/webhook`;
}

async function extractPaymentId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("id");
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const form = await request.formData();
      const id = form.get("id");
      if (typeof id === "string" && id.length > 0) return id;
    } catch {
      // fall through
    }
  }

  try {
    const cloned = request.clone();
    const text = await cloned.text();
    if (!text) return null;
    if (text.startsWith("{")) {
      const json = JSON.parse(text);
      if (typeof json?.id === "string") return json.id;
    }
    const params = new URLSearchParams(text);
    const id = params.get("id");
    if (id) return id;
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: Request) {
  const paymentId = await extractPaymentId(request);
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
  }

  const payment = await verifyWebhookPayment(paymentId);
  if (!payment.success) {
    if (payment.code === "MOLLIE_NOT_FOUND") {
      return NextResponse.json({ error: payment.error }, { status: 404 });
    }
    return NextResponse.json({ error: payment.error }, { status: 500 });
  }

  const orderStatus = mapMollieStatus(payment.data.status);
  const metadata = payment.data.metadata as { orderId?: string; email?: string; name?: string } | null;

  // ───────── Recurring charge from an existing subscription ─────────
  if (payment.data.subscriptionId) {
    if (orderStatus === "paid") {
      const renewed = await renewSubscriptionLicense({
        mollieSubscriptionId: payment.data.subscriptionId,
        molliePaymentId: payment.data.paymentId,
        paidAmountCents: payment.data.amount,
        rawWebhookPayload: payment.data,
      });
      if (renewed) {
        await logEvent({
          action: "license.extended",
          entityType: "license",
          entityId: renewed.licenseId,
          metadata: {
            paymentId: payment.data.paymentId,
            subscriptionId: payment.data.subscriptionId,
            newExpiresAt: renewed.newExpiresAt.toISOString(),
          },
        });
        await trackEvent("subscription_renewed", {
          amountCents: payment.data.amount,
        });

        const contact = await contactForLicense(renewed.licenseId);
        if (contact) {
          const mail = await sendRenewalEmail({
            to: contact.email,
            name: contact.name,
            amountCents: payment.data.amount,
            currency: payment.data.currency,
            newExpiresAt: renewed.newExpiresAt,
            subscriptionId: payment.data.subscriptionId,
            paymentId: payment.data.paymentId,
            licenseId: renewed.licenseId,
            userId: contact.userId ?? undefined,
          });
          if (!mail.success) {
            console.warn("[webhook] renewal email failed", mail.error, mail.code);
          }
        }
      }
      return NextResponse.json({
        received: true,
        kind: "subscription_renewed",
        idempotent: !renewed,
      });
    }

    if (orderStatus === "failed" || orderStatus === "canceled") {
      const past = await markSubscriptionPastDue({
        mollieSubscriptionId: payment.data.subscriptionId,
      });
      if (past) {
        await logEvent({
          action: "license.expired",
          entityType: "license",
          entityId: past.licenseId,
          metadata: {
            paymentId: payment.data.paymentId,
            subscriptionId: payment.data.subscriptionId,
            graceUntil: past.graceUntil.toISOString(),
            reason: orderStatus,
          },
        });

        const contact = await contactForLicense(past.licenseId);
        if (contact) {
          const mail = await sendPastDueEmail({
            to: contact.email,
            name: contact.name,
            graceUntil: past.graceUntil,
            subscriptionId: payment.data.subscriptionId,
            licenseId: past.licenseId,
            userId: contact.userId ?? undefined,
          });
          if (!mail.success) {
            console.warn("[webhook] past_due email failed", mail.error, mail.code);
          }
        }
      }
      return NextResponse.json({
        received: true,
        kind: "subscription_past_due",
        graceUntil: past?.graceUntil.toISOString() ?? null,
      });
    }

    if (orderStatus === "refunded") {
      // A refund on a recurring charge: lock immediately via order route.
      await markOrderStatus(payment.data.paymentId, "refunded");
      const contact = await contactForPayment(payment.data.paymentId);
      if (contact) {
        const mail = await sendRefundEmail({
          to: contact.email,
          name: contact.name,
          amountCents: payment.data.amount,
          currency: payment.data.currency,
          orderId: contact.orderId,
          userId: contact.userId ?? undefined,
        });
        if (!mail.success) {
          console.warn("[webhook] refund email failed", mail.error, mail.code);
        }
      }
      return NextResponse.json({ received: true, kind: "subscription_refunded" });
    }

    return NextResponse.json({ received: true, kind: "subscription_other" });
  }

  // ───────── First payment or one-off ─────────
  const orderId = metadata?.orderId ?? null;

  if (orderStatus === "paid") {
    const fulfilled = await fulfillPaidOrder({
      molliePaymentId: payment.data.paymentId,
      paidAmountCents: payment.data.amount,
      rawWebhookPayload: payment.data,
    });

    if (fulfilled) {
      await logEvent({
        action: "order.paid",
        entityType: "order",
        entityId: fulfilled.orderId,
        metadata: {
          paymentId: payment.data.paymentId,
          method: payment.data.method,
          amountCents: payment.data.amount,
        },
      });
      await trackEvent("payment_completed", {
        method: payment.data.method,
        amountCents: payment.data.amount,
      });

      if (metadata?.email) {
        const userIdFromMeta = (metadata as { userId?: string } | null)?.userId;
        const emailResult = await sendLicenseEmail({
          to: metadata.email,
          name: metadata.name,
          licenseCode: fulfilled.licenseCode,
          expiresAt: fulfilled.expiresAt ?? null,
          orderId: fulfilled.orderId,
          licenseId: fulfilled.licenseId,
          userId: userIdFromMeta,
        });
        if (!emailResult.success) {
          console.warn(
            "[webhook] license email failed",
            emailResult.error,
            emailResult.code,
          );
        }
      }

      // If this was a first-of-recurring payment AND the plan is recurring,
      // create the Mollie subscription so renewals happen automatically.
      const customerId = payment.data.customerId;
      const sequenceType = payment.data.sequenceType;
      if (
        customerId &&
        sequenceType === "first" &&
        isRecurringPlan(fulfilled.plan)
      ) {
        const interval = periodToMollieInterval(fulfilled.plan.period);
        if (interval) {
          const base = appBase();
          const sub = await createMollieSubscription({
            customerId,
            amountCents: fulfilled.plan.priceCents,
            currency: fulfilled.plan.currency,
            interval,
            description: `Dicteren.ai · ${fulfilled.plan.label} (auto-renew)`,
            webhookUrl: webhookUrlFor(base),
            startDate: fulfilled.expiresAt.toISOString().slice(0, 10),
            metadata: { licenseId: fulfilled.licenseId },
          });
          if (sub.success) {
            await recordSubscription({
              mollieSubscriptionId: sub.data.subscriptionId,
              mollieCustomerId: customerId,
              userId: await resolveUserIdByCustomer(customerId),
              organizationId: null,
              licenseId: fulfilled.licenseId,
              planId: fulfilled.plan.id,
              intervalLabel: interval,
              amountCents: fulfilled.plan.priceCents,
              currency: fulfilled.plan.currency,
              seats: 1,
              nextBillingAt: fulfilled.expiresAt,
            });
          } else {
            console.warn(
              "[webhook] subscription create failed",
              sub.error,
              sub.code,
            );
          }
        }
      }
    }

    return NextResponse.json({
      received: true,
      status: "paid",
      idempotent: !fulfilled,
    });
  }

  if (orderStatus === "failed" || orderStatus === "canceled") {
    await markOrderStatus(payment.data.paymentId, orderStatus);
    if (orderId) {
      await logEvent({
        action: "order.failed",
        entityType: "order",
        entityId: orderId,
        metadata: {
          paymentId: payment.data.paymentId,
          mollieStatus: payment.data.status,
        },
      });
    }
    return NextResponse.json({ received: true, status: orderStatus });
  }

  if (orderStatus === "refunded") {
    await markOrderStatus(payment.data.paymentId, "refunded");
    if (orderId) {
      await logEvent({
        action: "order.refunded",
        entityType: "order",
        entityId: orderId,
        metadata: { paymentId: payment.data.paymentId },
      });
    }
    const contact = await contactForPayment(payment.data.paymentId);
    if (contact) {
      const mail = await sendRefundEmail({
        to: contact.email,
        name: contact.name,
        amountCents: payment.data.amount,
        currency: payment.data.currency,
        orderId: contact.orderId,
      });
      if (!mail.success) {
        console.warn("[webhook] refund email failed", mail.error, mail.code);
      }
    }
    return NextResponse.json({ received: true, status: "refunded" });
  }

  return NextResponse.json({ received: true, status: orderStatus });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "mollie-webhook" });
}

async function resolveUserIdByCustomer(customerId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: userBilling.userId })
    .from(userBilling)
    .where(eq(userBilling.mollieCustomerId, customerId))
    .limit(1);
  return row?.userId ?? null;
}
