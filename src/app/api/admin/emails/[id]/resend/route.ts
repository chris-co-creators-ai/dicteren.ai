// Dicteren.ai — Admin: resend bestaande email uit email_logs.
//
// We bewaren de body NIET in email_logs (privacy + storage), dus de resend
// bouwt de mail opnieuw via de service-laag aan de hand van category +
// gekoppelde IDs (licenseId / orderId / userId).
//
// Ondersteund: license_issued (consumer + B2B-single), b2b_welcome_with_codes,
// subscription_past_due, subscription_canceled, subscription_renewed,
// refund, welcome, trial_started, b2b_payment_link.
//
// Niet-ondersteund: andere categories returnen 400 met duidelijke melding.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";
import {
  emailLogs,
  licenses,
  orders,
  subscriptions,
} from "@/lib/db/schema";
import { requireStaffApi } from "@/lib/auth/session";
import {
  sendCancelEmail,
  sendLicenseEmail,
  sendPastDueEmail,
  sendRefundEmail,
  sendRenewalEmail,
  sendTrialStartedEmail,
  sendWelcomeEmail,
} from "@/lib/services/email";
import { logEvent } from "@/lib/services/audit";

type Params = Promise<{ id: string }>;

export async function POST(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const { id: logId } = await params;

  const [log] = await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.id, logId))
    .limit(1);

  if (!log) {
    return NextResponse.json(
      { success: false, error: "Email-log niet gevonden" },
      { status: 404 },
    );
  }

  const to = log.toAddress;
  const userFallback = log.userId
    ? (
        await dbAuth
          .select({ name: authUser.name, email: authUser.email })
          .from(authUser)
          .where(eq(authUser.id, log.userId))
          .limit(1)
      )[0]
    : null;
  const name = userFallback?.name ?? undefined;

  let result;
  let resendKind = log.category;

  switch (log.category) {
    case "license_issued": {
      if (!log.licenseId) {
        return NextResponse.json(
          { success: false, error: "License-id ontbreekt op log" },
          { status: 400 },
        );
      }
      const [lic] = await db
        .select({
          code: licenses.code,
          expiresAt: licenses.expiresAt,
          userId: licenses.userId,
        })
        .from(licenses)
        .where(eq(licenses.id, log.licenseId))
        .limit(1);
      if (!lic) {
        return NextResponse.json(
          { success: false, error: "Licentie niet gevonden" },
          { status: 404 },
        );
      }
      result = await sendLicenseEmail({
        to,
        name,
        licenseCode: lic.code,
        expiresAt: lic.expiresAt,
        orderId: log.orderId ?? undefined,
        licenseId: log.licenseId,
        userId: lic.userId ?? undefined,
      });
      break;
    }

    case "welcome": {
      result = await sendWelcomeEmail({
        to,
        name,
        userId: log.userId ?? undefined,
      });
      break;
    }

    case "trial_started": {
      if (!log.licenseId) {
        return NextResponse.json(
          { success: false, error: "License-id ontbreekt op trial-log" },
          { status: 400 },
        );
      }
      const [lic] = await db
        .select({ code: licenses.code, expiresAt: licenses.expiresAt })
        .from(licenses)
        .where(eq(licenses.id, log.licenseId))
        .limit(1);
      if (!lic?.expiresAt) {
        return NextResponse.json(
          { success: false, error: "Trial-license heeft geen expiresAt" },
          { status: 400 },
        );
      }
      result = await sendTrialStartedEmail({
        to,
        name,
        licenseCode: lic.code,
        expiresAt: lic.expiresAt,
        userId: log.userId ?? undefined,
        licenseId: log.licenseId,
      });
      break;
    }

    case "subscription_past_due": {
      if (!log.subscriptionId) {
        return NextResponse.json(
          { success: false, error: "Subscription-id ontbreekt" },
          { status: 400 },
        );
      }
      const [sub] = await db
        .select({
          mollieSubId: subscriptions.mollieSubscriptionId,
          licenseId: subscriptions.licenseId,
        })
        .from(subscriptions)
        .where(eq(subscriptions.id, log.subscriptionId))
        .limit(1);
      if (!sub?.mollieSubId || !sub.licenseId) {
        return NextResponse.json(
          { success: false, error: "Subscription onvolledig" },
          { status: 400 },
        );
      }
      // 14-dagen grace vanaf nu (zelfde policy als webhook).
      const graceUntil = new Date();
      graceUntil.setDate(graceUntil.getDate() + 14);
      result = await sendPastDueEmail({
        to,
        name,
        graceUntil,
        subscriptionId: sub.mollieSubId,
        licenseId: sub.licenseId,
        userId: log.userId ?? undefined,
      });
      break;
    }

    case "subscription_canceled": {
      if (!log.subscriptionId) {
        return NextResponse.json(
          { success: false, error: "Subscription-id ontbreekt" },
          { status: 400 },
        );
      }
      const [sub] = await db
        .select({
          mollieSubId: subscriptions.mollieSubscriptionId,
          licenseId: subscriptions.licenseId,
        })
        .from(subscriptions)
        .where(eq(subscriptions.id, log.subscriptionId))
        .limit(1);
      if (!sub?.mollieSubId) {
        return NextResponse.json(
          { success: false, error: "Subscription onvolledig" },
          { status: 400 },
        );
      }
      const [lic] = sub.licenseId
        ? await db
            .select({ expiresAt: licenses.expiresAt })
            .from(licenses)
            .where(eq(licenses.id, sub.licenseId))
            .limit(1)
        : [];
      result = await sendCancelEmail({
        to,
        name,
        expiresAt: lic?.expiresAt ?? null,
        subscriptionId: sub.mollieSubId,
        licenseId: sub.licenseId ?? undefined,
        userId: log.userId ?? undefined,
      });
      break;
    }

    case "subscription_renewed": {
      if (!log.subscriptionId) {
        return NextResponse.json(
          { success: false, error: "Subscription-id ontbreekt" },
          { status: 400 },
        );
      }
      const [sub] = await db
        .select({
          mollieSubId: subscriptions.mollieSubscriptionId,
          licenseId: subscriptions.licenseId,
          amountCents: subscriptions.amountCents,
          currency: subscriptions.currency,
          nextBillingAt: subscriptions.nextBillingAt,
        })
        .from(subscriptions)
        .where(eq(subscriptions.id, log.subscriptionId))
        .limit(1);
      if (!sub?.mollieSubId || !sub.nextBillingAt) {
        return NextResponse.json(
          { success: false, error: "Subscription onvolledig" },
          { status: 400 },
        );
      }
      result = await sendRenewalEmail({
        to,
        name,
        amountCents: sub.amountCents,
        currency: sub.currency,
        newExpiresAt: sub.nextBillingAt,
        subscriptionId: sub.mollieSubId,
        paymentId: `resend-${Date.now()}`,
        licenseId: sub.licenseId ?? undefined,
        userId: log.userId ?? undefined,
      });
      break;
    }

    case "refund": {
      if (!log.orderId) {
        return NextResponse.json(
          { success: false, error: "Order-id ontbreekt" },
          { status: 400 },
        );
      }
      const [order] = await db
        .select({ amountCents: orders.amountCents, currency: orders.currency })
        .from(orders)
        .where(eq(orders.id, log.orderId))
        .limit(1);
      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order niet gevonden" },
          { status: 404 },
        );
      }
      result = await sendRefundEmail({
        to,
        name,
        amountCents: order.amountCents,
        currency: order.currency,
        orderId: log.orderId,
        licenseId: log.licenseId ?? undefined,
        userId: log.userId ?? undefined,
      });
      break;
    }

    default:
      return NextResponse.json(
        {
          success: false,
          error: `Resend voor category '${log.category}' is nog niet ondersteund. Gebruik de bron-actie (bv. nieuwe license uitgeven) in plaats van resend.`,
        },
        { status: 400 },
      );
  }

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 500 },
    );
  }

  await logEvent({
    action: "admin.action",
    entityType: "email_log",
    entityId: logId,
    actorId: session.user.id,
    metadata: {
      kind: "email_resent",
      category: resendKind,
      originalResendId: log.resendId,
      newResendId: result.data.id,
    },
  });

  return NextResponse.json({ success: true, newResendId: result.data.id });
}
