import "server-only";
import { count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authUsers,
  authOrganizations,
  discountCodes,
  emailLogs,
  events,
  licenses,
  licenseActivations,
  orders,
  plans,
  payments,
} from "@/lib/db/schema";

/**
 * Commerce service — reads on orders, payments, licenses for admin dashboards.
 * Keeps query construction in one place so pages stay thin.
 */

export type OrderRow = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  quantity: number;
  planSlug: string | null;
  planLabel: string | null;
  customerName: string | null;
  customerEmail: string | null;
  molliePaymentId: string | null;
  createdAt: Date;
  paidAt: Date | null;
};

export async function listOrders(limit = 50): Promise<OrderRow[]> {
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      amountCents: orders.amountCents,
      currency: orders.currency,
      quantity: orders.quantity,
      planSlug: plans.slug,
      planLabel: plans.label,
      customerName: authUsers.name,
      customerEmail: authUsers.email,
      molliePaymentId: orders.molliePaymentId,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .leftJoin(plans, eq(plans.id, orders.planId))
    .leftJoin(authUsers, eq(authUsers.id, orders.userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows;
}

export type LicenseRow = {
  id: string;
  code: string;
  type: string;
  status: string;
  seats: number;
  activationCount: number;
  userEmail: string | null;
  planSlug: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
};

export async function listLicenses(limit = 100): Promise<LicenseRow[]> {
  const rows = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      type: licenses.type,
      status: licenses.status,
      seats: licenses.seats,
      activationCount: licenses.activationCount,
      userEmail: authUsers.email,
      planSlug: plans.slug,
      issuedAt: licenses.issuedAt,
      expiresAt: licenses.expiresAt,
    })
    .from(licenses)
    .leftJoin(authUsers, eq(authUsers.id, licenses.userId))
    .leftJoin(plans, eq(plans.id, licenses.planId))
    .orderBy(desc(licenses.issuedAt))
    .limit(limit);
  return rows;
}

export type CommerceKpis = {
  ordersTotal: number;
  ordersPaid: number;
  ordersPending: number;
  ordersFailed: number;
  ordersRefunded: number;
  licensesActive: number;
  licensesTotal: number;
  revenueCentsAllTime: number;
  revenueCents30d: number;
};

export async function commerceKpis(): Promise<CommerceKpis> {
  const [
    [{ ordersTotal, ordersPaid, ordersPending, ordersFailed, ordersRefunded }],
    [{ licensesActive, licensesTotal }],
    [{ revenueCentsAllTime }],
    [{ revenueCents30d }],
  ] = await Promise.all([
    db
      .select({
        ordersTotal: count(),
        ordersPaid: sql<number>`count(*) filter (where ${orders.status} = 'paid')`,
        ordersPending: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
        ordersFailed: sql<number>`count(*) filter (where ${orders.status} = 'failed')`,
        ordersRefunded: sql<number>`count(*) filter (where ${orders.status} = 'refunded')`,
      })
      .from(orders),
    db
      .select({
        licensesTotal: count(),
        licensesActive: sql<number>`count(*) filter (where ${licenses.status} = 'active')`,
      })
      .from(licenses),
    db
      .select({
        revenueCentsAllTime: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, "paid")),
    db
      .select({
        revenueCents30d: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${payments.createdAt} > now() - interval '30 days'), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, "paid")),
  ]);

  return {
    ordersTotal: Number(ordersTotal ?? 0),
    ordersPaid: Number(ordersPaid ?? 0),
    ordersPending: Number(ordersPending ?? 0),
    ordersFailed: Number(ordersFailed ?? 0),
    ordersRefunded: Number(ordersRefunded ?? 0),
    licensesActive: Number(licensesActive ?? 0),
    licensesTotal: Number(licensesTotal ?? 0),
    revenueCentsAllTime: Number(revenueCentsAllTime ?? 0),
    revenueCents30d: Number(revenueCents30d ?? 0),
  };
}

// ─────────────────────── Invoices (derived from paid payments) ───────────────────────

export type InvoiceRow = {
  id: string;
  number: string;
  customer: string;
  email: string | null;
  amountCents: number;
  vatCents: number;
  totalCents: number;
  status: "paid" | "open" | "overdue" | "draft";
  issuedAt: Date;
  dueAt: Date;
  orderId: string;
};

/** Dutch BTW: VAT-incl total = amount, base = total/1.21, vat = total-base. */
function splitVatHigh(totalCents: number) {
  const baseCents = Math.round(totalCents / 1.21);
  return { baseCents, vatCents: totalCents - baseCents };
}

export async function listInvoices(limit = 100): Promise<InvoiceRow[]> {
  const rows = await db
    .select({
      id: payments.id,
      orderId: payments.orderId,
      paymentStatus: payments.status,
      orderStatus: orders.status,
      totalCents: payments.amountCents,
      createdAt: payments.createdAt,
      customerName: authUsers.name,
      customerEmail: authUsers.email,
    })
    .from(payments)
    .leftJoin(orders, eq(orders.id, payments.orderId))
    .leftJoin(authUsers, eq(authUsers.id, orders.userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);

  return rows.map((r, i) => {
    const { baseCents, vatCents } = splitVatHigh(r.totalCents);
    const issued = r.createdAt;
    const due = new Date(issued.getTime());
    due.setDate(due.getDate() + 14);
    const isOverdue = r.orderStatus !== "paid" && due < new Date();
    return {
      id: r.id,
      number: `DIC-${issued.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      customer: r.customerName ?? "Onbekend",
      email: r.customerEmail,
      amountCents: baseCents,
      vatCents,
      totalCents: r.totalCents,
      status: (r.orderStatus === "paid"
        ? "paid"
        : isOverdue
          ? "overdue"
          : "open") as "paid" | "open" | "overdue",
      issuedAt: issued,
      dueAt: due,
      orderId: r.orderId,
    };
  });
}

// ─────────────────────── Discount codes ───────────────────────

export type DiscountRow = {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_months";
  value: number;
  appliesTo: "consumer" | "organization" | null;
  redemptionCount: number;
  maxRedemptions: number | null;
  isActive: boolean;
  validFrom: Date | null;
  validUntil: Date | null;
  affiliateId: string | null;
};

export async function listDiscounts(): Promise<DiscountRow[]> {
  const rows = await db
    .select()
    .from(discountCodes)
    .orderBy(desc(discountCodes.createdAt));
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    type: r.type,
    value: r.value,
    appliesTo: r.appliesTo,
    redemptionCount: r.redemptionCount,
    maxRedemptions: r.maxRedemptions,
    isActive: r.isActive,
    validFrom: r.validFrom,
    validUntil: r.validUntil,
    affiliateId: r.affiliateId,
  }));
}

// ─────────────────────── License distribution ───────────────────────

export type LicenseDistribution = {
  type: "beta" | "consumer" | "team" | "partner";
  count: number;
  pct: number;
};

export async function licenseDistribution(): Promise<LicenseDistribution[]> {
  const rows = await db
    .select({ type: licenses.type, n: count() })
    .from(licenses)
    .groupBy(licenses.type);
  const total = rows.reduce((s, r) => s + Number(r.n), 0);
  const out: LicenseDistribution[] = (["beta", "consumer", "team"] as const).map(
    (t) => {
      const row = rows.find((r) => r.type === t);
      const c = Number(row?.n ?? 0);
      return { type: t, count: c, pct: total ? Math.round((c / total) * 100) : 0 };
    },
  );
  return out;
}

// ─────────────────────── Recent activity feed ───────────────────────

export type ActivityRow = {
  id: string;
  eventType: string;
  occurredAt: Date;
  userName: string | null;
  userEmail: string | null;
  properties: Record<string, unknown>;
};

export async function listRecentActivity(limit = 20): Promise<ActivityRow[]> {
  const rows = await db
    .select({
      id: events.id,
      eventType: events.eventType,
      occurredAt: events.occurredAt,
      properties: events.properties,
      userName: authUsers.name,
      userEmail: authUsers.email,
    })
    .from(events)
    .leftJoin(authUsers, eq(authUsers.id, events.userId))
    .orderBy(desc(events.occurredAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    occurredAt: r.occurredAt,
    userName: r.userName,
    userEmail: r.userEmail,
    properties: (r.properties ?? {}) as Record<string, unknown>,
  }));
}

// ─────────────────────── Activations time-series ───────────────────────

export async function activationsLastNDays(days = 14): Promise<{ date: string; count: number }[]> {
  const rows = await db
    .select({
      day: sql<string>`to_char(${licenseActivations.activatedAt}, 'YYYY-MM-DD')`,
      n: count(),
    })
    .from(licenseActivations)
    .where(gte(licenseActivations.activatedAt, sql`now() - (${days} || ' days')::interval`))
    .groupBy(sql`to_char(${licenseActivations.activatedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${licenseActivations.activatedAt}, 'YYYY-MM-DD')`);

  const byDay = new Map(rows.map((r) => [r.day, Number(r.n)]));
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

// ─────────────────────── Funnel / event aggregates ───────────────────────

export async function funnelEventCounts(): Promise<
  { eventType: string; count: number }[]
> {
  const rows = await db
    .select({ eventType: events.eventType, n: count() })
    .from(events)
    .groupBy(events.eventType)
    .orderBy(desc(count()));
  return rows.map((r) => ({ eventType: r.eventType, count: Number(r.n) }));
}

export async function activationsToday(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [{ n }] = await db
    .select({ n: count() })
    .from(licenseActivations)
    .where(gte(licenseActivations.activatedAt, today));
  return Number(n);
}

export async function expiringSoon(days = 30): Promise<number> {
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  const [{ n }] = await db
    .select({ n: count() })
    .from(licenses)
    .where(
      sql`${licenses.expiresAt} is not null and ${licenses.expiresAt} <= ${soon}::timestamptz and ${licenses.status} = 'active'`,
    );
  return Number(n);
}

// ─────────────────────── KPIs for overview ───────────────────────

export type OverviewKpis = {
  activeLicenses: number;
  betaCodes: number;
  activationsToday: number;
  activationsLast24h: number;
  expiringSoon: number;
  openOrders: number;
  revenueCents30d: number;
  revenueCentsAllTime: number;
};

export async function overviewKpis(): Promise<OverviewKpis> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    [{ activeLicenses }],
    [{ betaCodes }],
    [{ act24 }],
    [{ openOrders }],
    [{ revAll }],
    [{ rev30 }],
    expiring,
    actToday,
  ] = await Promise.all([
    db
      .select({ activeLicenses: count() })
      .from(licenses)
      .where(eq(licenses.status, "active")),
    db
      .select({ betaCodes: count() })
      .from(licenses)
      .where(eq(licenses.type, "beta")),
    db
      .select({ act24: count() })
      .from(licenseActivations)
      .where(gte(licenseActivations.activatedAt, yesterday)),
    db
      .select({ openOrders: count() })
      .from(orders)
      .where(eq(orders.status, "pending")),
    db
      .select({ revAll: sql<number>`coalesce(sum(${payments.amountCents}), 0)` })
      .from(payments)
      .where(eq(payments.status, "paid")),
    db
      .select({
        rev30: sql<number>`coalesce(sum(${payments.amountCents}) filter (where ${payments.createdAt} > now() - interval '30 days'), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, "paid")),
    expiringSoon(30),
    activationsToday(),
  ]);

  return {
    activeLicenses: Number(activeLicenses),
    betaCodes: Number(betaCodes),
    activationsToday: actToday,
    activationsLast24h: Number(act24),
    expiringSoon: Number(expiring),
    openOrders: Number(openOrders),
    revenueCents30d: Number(rev30 ?? 0),
    revenueCentsAllTime: Number(revAll ?? 0),
  };
}

// ─────────────────────── Audit log ───────────────────────

export async function listAuditEvents(limit = 50): Promise<ActivityRow[]> {
  const rows = await db
    .select({
      id: events.id,
      eventType: events.eventType,
      occurredAt: events.occurredAt,
      properties: events.properties,
      userName: authUsers.name,
      userEmail: authUsers.email,
    })
    .from(events)
    .leftJoin(authUsers, eq(authUsers.id, events.userId))
    .where(sql`${events.eventType} like 'audit.%'`)
    .orderBy(desc(events.occurredAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    occurredAt: r.occurredAt,
    userName: r.userName,
    userEmail: r.userEmail,
    properties: (r.properties ?? {}) as Record<string, unknown>,
  }));
}


export type EmailLogRow = {
  id: string;
  resendId: string | null;
  toAddress: string;
  fromAddress: string;
  subject: string;
  category: string;
  status: string;
  errorMessage: string | null;
  errorCode: string | null;
  userName: string | null;
  userEmail: string | null;
  licenseCode: string | null;
  orderId: string | null;
  subscriptionId: string | null;
  sentAt: Date;
  deliveredAt: Date | null;
  lastEventAt: Date | null;
};

export async function listEmailLogs(limit = 200): Promise<EmailLogRow[]> {
  const rows = await db
    .select({
      id: emailLogs.id,
      resendId: emailLogs.resendId,
      toAddress: emailLogs.toAddress,
      fromAddress: emailLogs.fromAddress,
      subject: emailLogs.subject,
      category: emailLogs.category,
      status: emailLogs.status,
      errorMessage: emailLogs.errorMessage,
      errorCode: emailLogs.errorCode,
      sentAt: emailLogs.sentAt,
      deliveredAt: emailLogs.deliveredAt,
      lastEventAt: emailLogs.lastEventAt,
      orderId: emailLogs.orderId,
      subscriptionId: emailLogs.subscriptionId,
      userName: authUsers.name,
      userEmail: authUsers.email,
      licenseCode: licenses.code,
    })
    .from(emailLogs)
    .leftJoin(authUsers, eq(authUsers.id, emailLogs.userId))
    .leftJoin(licenses, eq(licenses.id, emailLogs.licenseId))
    .orderBy(desc(emailLogs.sentAt))
    .limit(limit);
  return rows;
}

export type EmailKpis = {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  byCategory: { category: string; count: number }[];
};

export async function emailKpis(): Promise<EmailKpis> {
  const totalRows = await db
    .select({ total: count() })
    .from(emailLogs);
  const total = totalRows[0]?.total ?? 0;

  const statusRows = await db
    .select({ status: emailLogs.status, c: count() })
    .from(emailLogs)
    .groupBy(emailLogs.status);
  const tally = (s: string) => statusRows.find((r) => r.status === s)?.c ?? 0;

  const catRows = await db
    .select({ category: emailLogs.category, c: count() })
    .from(emailLogs)
    .groupBy(emailLogs.category)
    .orderBy(desc(count()));

  return {
    total,
    sent: tally("sent") + tally("delivered") + tally("opened") + tally("clicked"),
    delivered: tally("delivered") + tally("opened") + tally("clicked"),
    failed: tally("failed"),
    bounced: tally("bounced") + tally("complained"),
    byCategory: catRows.map((r) => ({ category: r.category, count: r.c })),
  };
}
