// Dicteren.ai — Customer timeline service
// Builds a chronological list of every event the admin can see for one user:
// account creation, license issuance, email sends + delivery, payments,
// device activations, subscription lifecycle.

import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authUsers,
  devices,
  emailLogs,
  events,
  licenseActivations,
  licenses,
  orders,
  payments,
  plans,
  subscriptions,
} from "@/lib/db/schema";

export type TimelineKind =
  | "account_created"
  | "trial_started"
  | "license_issued"
  | "license_activated"
  | "license_reactivated"
  | "order_created"
  | "order_paid"
  | "order_refunded"
  | "subscription_canceled"
  | "subscription_past_due"
  | "subscription_renewed"
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  | "email_bounced"
  | "email_failed";

export type TimelineEntry = {
  id: string;
  at: Date;
  kind: TimelineKind;
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
};

export type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  emailVerified: boolean;
  role: string | null;
  trialStartedAt: Date | null;
  trialExpiresAt: Date | null;
  trialStatus: string | null;
  trialLicenseCode: string | null;
  paidLicenseCount: number;
  totalOrders: number;
  totalRevenueCents: number;
  isConverted: boolean;
  /** Email-aggregaten (alle mails ooit gestuurd). */
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
};

export async function getCustomerSummary(
  userId: string,
): Promise<CustomerSummary | null> {
  const [user] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  if (!user) return null;

  const userLicenses = await db
    .select()
    .from(licenses)
    .where(eq(licenses.userId, userId));

  const trial = userLicenses.find((l) => l.code.startsWith("DIC-TRIAL-"));
  const paid = userLicenses.filter((l) => !l.code.startsWith("DIC-TRIAL-"));

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId));

  const paidOrders = userOrders.filter((o) => o.status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.amountCents, 0);

  const userEmails = await db
    .select({ status: emailLogs.status })
    .from(emailLogs)
    .where(eq(emailLogs.userId, userId));

  const emailsSent = userEmails.length;
  const emailsOpened = userEmails.filter((e) =>
    ["opened", "clicked"].includes(e.status),
  ).length;
  const emailsClicked = userEmails.filter((e) => e.status === "clicked").length;
  const emailsBounced = userEmails.filter((e) =>
    ["bounced", "complained"].includes(e.status),
  ).length;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    role: user.role,
    trialStartedAt: trial?.issuedAt ?? null,
    trialExpiresAt: trial?.expiresAt ?? null,
    trialStatus: trial?.status ?? null,
    trialLicenseCode: trial?.code ?? null,
    paidLicenseCount: paid.length,
    totalOrders: userOrders.length,
    totalRevenueCents: totalRevenue,
    isConverted: paid.length > 0,
    emailsSent,
    emailsOpened,
    emailsClicked,
    emailsBounced,
  };
}

export async function getCustomerTimeline(
  userId: string,
): Promise<TimelineEntry[]> {
  const [user] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  if (!user) return [];

  const entries: TimelineEntry[] = [];

  // 1. Account creation
  entries.push({
    id: `account/${user.id}`,
    at: user.createdAt,
    kind: "account_created",
    title: "Account aangemaakt",
    detail: user.email,
    meta: { emailVerified: user.emailVerified },
  });

  // 2. Licenses (issued + linked plan)
  const userLicenses = await db
    .select({
      license: licenses,
      planLabel: plans.label,
      planSlug: plans.slug,
    })
    .from(licenses)
    .leftJoin(plans, eq(plans.id, licenses.planId))
    .where(eq(licenses.userId, userId));

  for (const row of userLicenses) {
    const l = row.license;
    const isTrial = l.code.startsWith("DIC-TRIAL-");
    entries.push({
      id: `license-issued/${l.id}`,
      at: l.issuedAt,
      kind: isTrial ? "trial_started" : "license_issued",
      title: isTrial
        ? "Trial gestart"
        : `Licentie uitgegeven · ${row.planLabel ?? l.type}`,
      detail: l.code,
      meta: {
        licenseId: l.id,
        expiresAt: l.expiresAt?.toISOString() ?? null,
        status: l.status,
        plan: row.planSlug,
      },
    });
  }

  // 3. License activations (joined with devices for fingerprint detail)
  if (userLicenses.length > 0) {
    const licenseIds = userLicenses.map((r) => r.license.id);
    const activations = await db
      .select({
        activation: licenseActivations,
        deviceFp: devices.fingerprint,
        devicePlatform: devices.platform,
        licenseCode: licenses.code,
      })
      .from(licenseActivations)
      .leftJoin(devices, eq(devices.id, licenseActivations.deviceId))
      .leftJoin(licenses, eq(licenses.id, licenseActivations.licenseId))
      .where(inArray(licenseActivations.licenseId, licenseIds))
      .orderBy(asc(licenseActivations.activatedAt));

    for (const a of activations) {
      entries.push({
        id: `activation/${a.activation.id}`,
        at: a.activation.activatedAt,
        kind: "license_activated",
        title: `Apparaat geactiveerd · ${a.devicePlatform ?? "onbekend"}`,
        detail: `${a.licenseCode ?? "—"} · ${a.deviceFp?.slice(0, 16) ?? "—"}`,
        meta: {
          licenseId: a.activation.licenseId,
          deviceId: a.activation.deviceId,
          fingerprint: a.deviceFp,
        },
      });
      if (a.activation.deactivatedAt) {
        entries.push({
          id: `activation-de/${a.activation.id}`,
          at: a.activation.deactivatedAt,
          kind: "license_activated",
          title: "Activatie ingetrokken",
          detail: a.licenseCode ?? undefined,
        });
      }
    }
  }

  // 4. Orders + payments
  const userOrders = await db
    .select({
      order: orders,
      planLabel: plans.label,
    })
    .from(orders)
    .leftJoin(plans, eq(plans.id, orders.planId))
    .where(eq(orders.userId, userId));

  for (const row of userOrders) {
    const o = row.order;
    entries.push({
      id: `order-created/${o.id}`,
      at: o.createdAt,
      kind: "order_created",
      title: `Order aangemaakt · ${row.planLabel ?? "?"}`,
      detail: `€${(o.amountCents / 100).toFixed(2)} · ${o.status}`,
      meta: { orderId: o.id, amountCents: o.amountCents, status: o.status },
    });
    if (o.paidAt) {
      entries.push({
        id: `order-paid/${o.id}`,
        at: o.paidAt,
        kind: "order_paid",
        title: "Betaling ontvangen",
        detail: `€${(o.amountCents / 100).toFixed(2)} · ${o.molliePaymentId?.slice(0, 12) ?? "—"}`,
        meta: {
          orderId: o.id,
          paymentId: o.molliePaymentId,
          amountCents: o.amountCents,
        },
      });
    }
    if (o.status === "refunded") {
      entries.push({
        id: `order-refunded/${o.id}`,
        at: o.updatedAt,
        kind: "order_refunded",
        title: "Order teruggebetaald",
        detail: `€${(o.amountCents / 100).toFixed(2)}`,
      });
    }
  }

  // 5. Subscription events
  const userSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  for (const s of userSubs) {
    if (s.status === "past_due") {
      entries.push({
        id: `sub-pastdue/${s.id}`,
        at: s.updatedAt,
        kind: "subscription_past_due",
        title: "Abonnement past_due",
        detail: `Mollie: ${s.mollieSubscriptionId.slice(0, 14)}…`,
      });
    }
    if (s.canceledAt) {
      entries.push({
        id: `sub-canceled/${s.id}`,
        at: s.canceledAt,
        kind: "subscription_canceled",
        title: "Abonnement opgezegd",
        detail: `Mollie: ${s.mollieSubscriptionId.slice(0, 14)}…`,
      });
    }
  }

  // 6. Payments (renewal-charges identified via subscription link)
  const orderIds = userOrders.map((r) => r.order.id);
  if (orderIds.length > 0) {
    const userPayments = await db
      .select()
      .from(payments)
      .where(inArray(payments.orderId, orderIds));
    // Don't repeat first-paid (already added via orders); only count
    // additional payments as renewals.
    const firstPaidByOrder = new Map<string, string>();
    for (const o of userOrders) {
      if (o.order.molliePaymentId) {
        firstPaidByOrder.set(o.order.id, o.order.molliePaymentId);
      }
    }
    for (const p of userPayments) {
      if (firstPaidByOrder.get(p.orderId) === p.molliePaymentId) continue;
      entries.push({
        id: `renewal/${p.id}`,
        at: p.createdAt,
        kind: "subscription_renewed",
        title: "Abonnement verlengd",
        detail: `€${(p.amountCents / 100).toFixed(2)} · ${p.molliePaymentId.slice(0, 14)}…`,
      });
    }
  }

  // 7. Emails — one entry per status transition.
  const userEmails = await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.userId, userId))
    .orderBy(desc(emailLogs.sentAt));

  for (const e of userEmails) {
    entries.push({
      id: `email-sent/${e.id}`,
      at: e.sentAt,
      kind: e.status === "failed" ? "email_failed" : "email_sent",
      title: `Mail ${e.status === "failed" ? "verzending mislukt" : "verstuurd"} · ${e.subject}`,
      detail: `${e.category} → ${e.toAddress}`,
      meta: {
        emailId: e.id,
        resendId: e.resendId,
        category: e.category,
        status: e.status,
        errorMessage: e.errorMessage,
      },
    });
    if (e.deliveredAt) {
      entries.push({
        id: `email-delivered/${e.id}`,
        at: e.deliveredAt,
        kind: "email_delivered",
        title: `Mail afgeleverd · ${e.subject}`,
        detail: e.toAddress,
      });
    }
    if (e.lastEventAt && ["opened", "clicked"].includes(e.status)) {
      entries.push({
        id: `email-status/${e.id}/${e.status}`,
        at: e.lastEventAt,
        kind: e.status === "clicked" ? "email_clicked" : "email_opened",
        title: `Mail ${e.status === "clicked" ? "geklikt" : "geopend"} · ${e.subject}`,
        detail: e.toAddress,
      });
    }
    if (e.lastEventAt && ["bounced", "complained"].includes(e.status)) {
      entries.push({
        id: `email-bounce/${e.id}`,
        at: e.lastEventAt,
        kind: "email_bounced",
        title: `Mail ${e.status === "complained" ? "spam-klacht" : "bounce"} · ${e.subject}`,
        detail: e.errorMessage ?? e.toAddress,
      });
    }
  }

  // 8. Custom audit/product events (catch-all for actions not covered above)
  const audit = await db
    .select()
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(desc(events.occurredAt))
    .limit(50);
  for (const ev of audit) {
    if (ev.eventType.startsWith("audit.")) continue; // already represented
    entries.push({
      id: `event/${ev.id}`,
      at: ev.occurredAt,
      kind: "email_sent" as TimelineKind, // generic placeholder
      title: ev.eventType,
      detail: JSON.stringify(ev.properties ?? {}),
    });
  }

  // Sort descending: newest first
  entries.sort((a, b) => b.at.getTime() - a.at.getTime());

  return entries;
}
