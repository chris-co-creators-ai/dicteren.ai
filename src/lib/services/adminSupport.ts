// Dicteren.ai — Admin support-service
//
// De backend van de support-cockpit (/admin/crm/[userId]). Eén plek waar admin
// en account managers de hele situatie van een klant zien en kunnen ingrijpen.
//
// Drie soorten functies:
//   1. getCustomerSupportSnapshot — alles-in-één leesaggregatie (G6).
//   2. overrideLicense            — status forceren / geldigheid verlengen (G3).
//   3. retrySubscriptionForLicense — mislukte auto-renew alsnog aanmaken (G4).
//
// G1 (apparaat deactiveren) hergebruikt revokeActivation uit orgSeats.ts.
// G2 (licentie uitgeven voor betaalde order) loopt via de fulfill-route die de
//    idempotente webhook re-triggert (order.ts fulfillPaidOrder, B1-fix).
// G5 (seatbeheer namens org) hergebruikt orgSeats.ts + orderUpgrade.ts.

import "server-only";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { hashLicenseCode, normalizeLicenseCode } from "./license";
import {
  authMembers,
  authOrganizations,
  authUsers,
  devices,
  emailLogs,
  licenseActivations,
  licenses,
  orders,
  plans,
  subscriptions,
  userBilling,
  type License,
} from "@/lib/db/schema";

/** Licentie-status union, afgeleid van de DB-enum (matcht licenses.status). */
type LicenseStatus = License["status"];
import { logEvent } from "./audit";
import {
  createMollieSubscription,
  periodToMollieInterval,
} from "./mollie";
import { recordSubscription } from "./order";
import { getPricing } from "./pricing";
import { businessAmountCents, withVatCents } from "./pricingTiers";
import { appBase, webhookUrlFor } from "@/lib/url";

// ───── G6: snapshot ────────────────────────────────────────────────

export type SupportActivation = {
  activationId: string;
  deviceId: string;
  fingerprint: string;
  platform: string | null;
  appVersion: string | null;
  isActive: boolean;
  activatedAt: string;
  lastSeenAt: string | null;
};

export type SupportLicense = {
  id: string;
  code: string;
  type: string;
  status: LicenseStatus;
  source: string | null;
  planLabel: string | null;
  period: string | null;
  seats: number;
  maxActivationsPerSeat: number;
  expiresAt: string | null;
  organizationId: string | null;
  orderId: string | null;
  activeDeviceCount: number;
  deviceLimit: number;
  activations: SupportActivation[];
};

export type SupportOrder = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  planLabel: string | null;
  molliePaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
  /** True als er minimaal één licentie aan deze order hangt. False + paid =
   *  betaald-zonder-licentie (herstelbaar via de fulfill-actie). */
  hasLicense: boolean;
};

export type SupportSubscription = {
  id: string;
  status: string;
  mollieSubscriptionId: string;
  amountCents: number;
  currency: string;
  seats: number;
  nextBillingAt: string | null;
  licenseId: string | null;
};

export type SupportEmail = {
  id: string;
  category: string;
  subject: string;
  status: string;
  toAddress: string;
  sentAt: string;
  resendId: string | null;
};

export type SupportMembership = {
  organizationId: string;
  organizationName: string;
  role: string;
};

export type CustomerSupportSnapshot = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string | null;
    emailVerified: boolean;
    createdAt: string;
    mollieCustomerId: string | null;
  };
  licenses: SupportLicense[];
  orders: SupportOrder[];
  subscriptions: SupportSubscription[];
  emails: SupportEmail[];
  memberships: SupportMembership[];
} | null;

/** Eén leesaggregatie voor de support-cockpit. Batcht de queries per entiteit. */
export async function getCustomerSupportSnapshot(
  userId: string,
): Promise<CustomerSupportSnapshot> {
  const [user] = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
      emailVerified: authUsers.emailVerified,
      createdAt: authUsers.createdAt,
    })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  if (!user) return null;

  const [billing] = await db
    .select({ mollieCustomerId: userBilling.mollieCustomerId })
    .from(userBilling)
    .where(eq(userBilling.userId, userId))
    .limit(1);

  // Licenties van deze user (incl. plan-label).
  const licenseRows = await db
    .select({
      id: licenses.id,
      code: licenses.code,
      type: licenses.type,
      status: licenses.status,
      source: licenses.source,
      seats: licenses.seats,
      maxActivationsPerSeat: licenses.maxActivationsPerSeat,
      expiresAt: licenses.expiresAt,
      organizationId: licenses.organizationId,
      orderId: licenses.orderId,
      planLabel: plans.label,
      planPeriod: plans.period,
    })
    .from(licenses)
    .leftJoin(plans, eq(plans.id, licenses.planId))
    .where(eq(licenses.userId, userId))
    .orderBy(desc(licenses.issuedAt));

  const licenseIds = licenseRows.map((l) => l.id);

  // Activaties + device-info per licentie.
  const activationRows = licenseIds.length
    ? await db
        .select({
          activationId: licenseActivations.id,
          licenseId: licenseActivations.licenseId,
          deviceId: licenseActivations.deviceId,
          isActive: licenseActivations.isActive,
          activatedAt: licenseActivations.activatedAt,
          fingerprint: devices.fingerprint,
          platform: devices.platform,
          appVersion: devices.appVersion,
          lastSeenAt: devices.lastSeenAt,
        })
        .from(licenseActivations)
        .leftJoin(devices, eq(devices.id, licenseActivations.deviceId))
        .where(inArray(licenseActivations.licenseId, licenseIds))
        .orderBy(desc(licenseActivations.activatedAt))
    : [];

  const activationsByLicense = new Map<string, SupportActivation[]>();
  for (const a of activationRows) {
    const list = activationsByLicense.get(a.licenseId) ?? [];
    list.push({
      activationId: a.activationId,
      deviceId: a.deviceId,
      fingerprint: a.fingerprint ?? "—",
      platform: a.platform,
      appVersion: a.appVersion,
      isActive: a.isActive,
      activatedAt: a.activatedAt.toISOString(),
      lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
    });
    activationsByLicense.set(a.licenseId, list);
  }

  const supportLicenses: SupportLicense[] = licenseRows.map((l) => {
    const acts = activationsByLicense.get(l.id) ?? [];
    return {
      id: l.id,
      code: l.code,
      type: l.type,
      status: l.status,
      source: l.source,
      planLabel: l.planLabel,
      period: l.planPeriod ?? null,
      seats: l.seats,
      maxActivationsPerSeat: l.maxActivationsPerSeat,
      expiresAt: l.expiresAt?.toISOString() ?? null,
      organizationId: l.organizationId,
      orderId: l.orderId,
      activeDeviceCount: acts.filter((a) => a.isActive).length,
      deviceLimit: l.seats * l.maxActivationsPerSeat,
      activations: acts,
    };
  });

  // Orders + of er een licentie aan hangt (paid-zonder-licentie detectie).
  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      amountCents: orders.amountCents,
      currency: orders.currency,
      molliePaymentId: orders.molliePaymentId,
      paidAt: orders.paidAt,
      createdAt: orders.createdAt,
      planLabel: plans.label,
    })
    .from(orders)
    .leftJoin(plans, eq(plans.id, orders.planId))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  const orderIds = orderRows.map((o) => o.id);
  const licenseOrderIds = new Set(
    (orderIds.length
      ? await db
          .select({ orderId: licenses.orderId })
          .from(licenses)
          .where(inArray(licenses.orderId, orderIds))
      : []
    )
      .map((r) => r.orderId)
      .filter((id): id is string => Boolean(id)),
  );

  const supportOrders: SupportOrder[] = orderRows.map((o) => ({
    id: o.id,
    status: o.status,
    amountCents: o.amountCents,
    currency: o.currency,
    planLabel: o.planLabel,
    molliePaymentId: o.molliePaymentId,
    paidAt: o.paidAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    hasLicense: licenseOrderIds.has(o.id),
  }));

  // Subscriptions van deze user.
  const subRows = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      mollieSubscriptionId: subscriptions.mollieSubscriptionId,
      amountCents: subscriptions.amountCents,
      currency: subscriptions.currency,
      seats: subscriptions.seats,
      nextBillingAt: subscriptions.nextBillingAt,
      licenseId: subscriptions.licenseId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));

  const supportSubs: SupportSubscription[] = subRows.map((s) => ({
    id: s.id,
    status: s.status,
    mollieSubscriptionId: s.mollieSubscriptionId,
    amountCents: s.amountCents,
    currency: s.currency,
    seats: s.seats,
    nextBillingAt: s.nextBillingAt?.toISOString() ?? null,
    licenseId: s.licenseId,
  }));

  // Recente mails (voor resend-acties).
  const emailRows = await db
    .select({
      id: emailLogs.id,
      category: emailLogs.category,
      subject: emailLogs.subject,
      status: emailLogs.status,
      toAddress: emailLogs.toAddress,
      sentAt: emailLogs.sentAt,
      resendId: emailLogs.resendId,
    })
    .from(emailLogs)
    .where(eq(emailLogs.userId, userId))
    .orderBy(desc(emailLogs.sentAt))
    .limit(50);

  const supportEmails: SupportEmail[] = emailRows.map((e) => ({
    id: e.id,
    category: e.category,
    subject: e.subject,
    status: e.status,
    toAddress: e.toAddress,
    sentAt: e.sentAt.toISOString(),
    resendId: e.resendId,
  }));

  // Org-memberships (voor seatbeheer-deeplinks).
  const memberRows = await db
    .select({
      organizationId: authMembers.organizationId,
      role: authMembers.role,
      organizationName: authOrganizations.name,
    })
    .from(authMembers)
    .leftJoin(
      authOrganizations,
      eq(authOrganizations.id, authMembers.organizationId),
    )
    .where(eq(authMembers.userId, userId));

  const memberships: SupportMembership[] = memberRows.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organizationName ?? "Onbekende organisatie",
    role: m.role,
  }));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
      mollieCustomerId: billing?.mollieCustomerId ?? null,
    },
    licenses: supportLicenses,
    orders: supportOrders,
    subscriptions: supportSubs,
    emails: supportEmails,
    memberships,
  };
}

// ───── G3: status-override + geldigheid verlengen ──────────────────

export type OverrideLicenseResult =
  | { success: true; licenseId: string; status: LicenseStatus; expiresAt: string | null }
  | { success: false; error: string; code: string };

/** Forceer een licentie-status en/of verleng de geldigheid. Voor support-
 *  gevallen die de normale flow niet dekt (klant betaalde maar staat op expired,
 *  coulance-verlenging, een per ongeluk gerevokede licentie terugzetten). */
export async function overrideLicense(args: {
  licenseId: string;
  setStatus?: LicenseStatus;
  extendMonths?: number;
  actorUserId: string;
  reason?: string;
}): Promise<OverrideLicenseResult> {
  const [lic] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, args.licenseId))
    .limit(1);
  if (!lic) {
    return { success: false, error: "Licentie niet gevonden", code: "NOT_FOUND" };
  }
  if (!args.setStatus && !args.extendMonths) {
    return {
      success: false,
      error: "Niets te wijzigen: geef een status of een aantal maanden op.",
      code: "NOOP",
    };
  }

  const patch: {
    status?: LicenseStatus;
    expiresAt?: Date;
    revokedAt?: Date | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (args.setStatus) {
    patch.status = args.setStatus;
    // Terugzetten naar actief = revokedAt wissen zodat het geen dode licentie lijkt.
    if (args.setStatus === "active" || args.setStatus === "trial") {
      patch.revokedAt = null;
    }
    if (args.setStatus === "revoked") {
      patch.revokedAt = new Date();
    }
  }

  if (args.extendMonths && args.extendMonths !== 0) {
    const base =
      lic.expiresAt && lic.expiresAt.getTime() > Date.now()
        ? new Date(lic.expiresAt)
        : new Date();
    base.setMonth(base.getMonth() + args.extendMonths);
    patch.expiresAt = base;
  }

  await db.update(licenses).set(patch).where(eq(licenses.id, lic.id));

  await logEvent({
    action: args.extendMonths ? "license.extended" : "license.reset",
    entityType: "license",
    entityId: lic.id,
    actorId: args.actorUserId,
    metadata: {
      kind: "admin_override",
      setStatus: args.setStatus ?? null,
      extendMonths: args.extendMonths ?? null,
      previousStatus: lic.status,
      previousExpiresAt: lic.expiresAt?.toISOString() ?? null,
      reason: args.reason ?? null,
    },
  });

  return {
    success: true,
    licenseId: lic.id,
    status: patch.status ?? lic.status,
    expiresAt: (patch.expiresAt ?? lic.expiresAt)?.toISOString() ?? null,
  };
}

// ───── G4: mislukte auto-renew alsnog aanmaken ─────────────────────

export type RetrySubscriptionResult =
  | { success: true; mollieSubscriptionId: string }
  | { success: false; error: string; code: string };

/** Maak een Mollie-subscription aan voor een licentie waar de auto-renew nooit
 *  is aangemaakt (webhook logde subscription.creation_failed). Recomputed het
 *  bedrag exact zoals de webhook dat doet. */
export async function retrySubscriptionForLicense(args: {
  licenseId: string;
  actorUserId: string;
}): Promise<RetrySubscriptionResult> {
  const [lic] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.id, args.licenseId))
    .limit(1);
  if (!lic) {
    return { success: false, error: "Licentie niet gevonden", code: "NOT_FOUND" };
  }
  if (!lic.planId) {
    return { success: false, error: "Licentie heeft geen plan", code: "NO_PLAN" };
  }

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, lic.planId))
    .limit(1);
  if (!plan) {
    return { success: false, error: "Plan niet gevonden", code: "NO_PLAN" };
  }
  if (plan.period === "lifetime") {
    return {
      success: false,
      error: "Lifetime-licenties hebben geen abonnement.",
      code: "NOT_RECURRING",
    };
  }

  // Bestaat er al een actieve sub voor deze licentie of org? Dan niks doen.
  const existingActive = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        lic.organizationId
          ? eq(subscriptions.organizationId, lic.organizationId)
          : eq(subscriptions.licenseId, lic.id),
        inArray(subscriptions.status, ["active", "past_due"]),
      ),
    )
    .limit(1);
  if (existingActive.length > 0) {
    return {
      success: false,
      error: "Er is al een actieve subscription voor deze klant.",
      code: "ALREADY_ACTIVE",
    };
  }

  // Mollie customer-id: van de eigenaar (license.userId) via user_billing.
  if (!lic.userId) {
    return {
      success: false,
      error: "Licentie heeft geen eigenaar met Mollie-customer.",
      code: "NO_OWNER",
    };
  }
  const [billing] = await db
    .select({ mollieCustomerId: userBilling.mollieCustomerId })
    .from(userBilling)
    .where(eq(userBilling.userId, lic.userId))
    .limit(1);
  if (!billing?.mollieCustomerId) {
    return {
      success: false,
      error: "Geen Mollie customer-id voor deze klant.",
      code: "NO_CUSTOMER",
    };
  }

  const interval = periodToMollieInterval(plan.period);
  if (!interval) {
    return { success: false, error: "Periode niet recurring", code: "NOT_RECURRING" };
  }

  // Bedrag: team = staffel × seats × btw; consumer = plan.priceCents.
  const isTeam = plan.customerType === "organization";
  let amountCents = plan.priceCents;
  let seats = lic.seats;
  if (isTeam) {
    // Team-seats: tel de live team-seats van de org.
    if (lic.organizationId) {
      const teamSeats = await db
        .select({ id: licenses.id })
        .from(licenses)
        .where(
          and(
            eq(licenses.organizationId, lic.organizationId),
            eq(licenses.type, "team"),
            inArray(licenses.status, ["active", "unassigned", "past_due", "trial"]),
          ),
        );
      seats = Math.max(1, teamSeats.length);
    }
    const pricing = await getPricing();
    amountCents = withVatCents(businessAmountCents(pricing, seats, plan.period));
  }

  const expiresAt = lic.expiresAt ?? new Date();
  const sub = await createMollieSubscription({
    customerId: billing.mollieCustomerId,
    amountCents,
    currency: plan.currency,
    interval,
    description: `Dicteren.ai · ${plan.label} (auto-renew, hersteld)`,
    webhookUrl: webhookUrlFor(appBase()),
    startDate: expiresAt.toISOString().slice(0, 10),
    metadata: {
      userId: lic.userId,
      segment: isTeam ? "team" : "consumer",
      source: lic.source ?? "self-signup",
      licenseType: isTeam ? "team" : "consumer",
      period: plan.period,
      internalRef: lic.id,
      licenseId: lic.id,
      kind: "subscription_retry",
    },
  });

  if (!sub.success) {
    return {
      success: false,
      error: sub.error,
      code: sub.code ?? "MOLLIE_FAIL",
    };
  }

  await recordSubscription({
    mollieSubscriptionId: sub.data.subscriptionId,
    mollieCustomerId: billing.mollieCustomerId,
    userId: lic.userId,
    organizationId: lic.organizationId,
    licenseId: lic.id,
    planId: plan.id,
    intervalLabel: interval,
    amountCents,
    currency: plan.currency,
    seats,
    nextBillingAt: expiresAt,
  });

  await logEvent({
    action: "admin.action",
    entityType: "subscription",
    entityId: sub.data.subscriptionId,
    actorId: args.actorUserId,
    metadata: {
      kind: "subscription_retry",
      licenseId: lic.id,
      amountCents,
      seats,
    },
  });

  return { success: true, mollieSubscriptionId: sub.data.subscriptionId };
}

// ───── Zoek-ingang voor de support-cockpit ─────────────────────────

export type SupportSearchMatch = {
  userId: string;
  name: string;
  email: string;
  matchedOn: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolve een vrije zoekterm naar klant(en) voor de cockpit. Probeert e-mail/
 *  naam (partial), licentiecode, order-id en apparaat-fingerprint. */
export async function findCustomersForSupport(
  query: string,
): Promise<SupportSearchMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const matches = new Map<string, SupportSearchMatch>();

  const addUser = async (userId: string | null, matchedOn: string) => {
    if (!userId || matches.has(userId)) return;
    const [u] = await db
      .select({ id: authUsers.id, name: authUsers.name, email: authUsers.email })
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1);
    if (u) matches.set(u.id, { userId: u.id, name: u.name, email: u.email, matchedOn });
  };

  // E-mail / naam (partial).
  const users = await db
    .select({ id: authUsers.id, name: authUsers.name, email: authUsers.email })
    .from(authUsers)
    .where(
      or(ilike(authUsers.email, `%${q}%`), ilike(authUsers.name, `%${q}%`)),
    )
    .limit(15);
  for (const u of users) {
    matches.set(u.id, {
      userId: u.id,
      name: u.name,
      email: u.email,
      matchedOn: "e-mail of naam",
    });
  }

  // Licentiecode (volledige code → hash-match).
  if (/^dic/i.test(q.replace(/[\s-]/g, ""))) {
    try {
      const hash = hashLicenseCode(normalizeLicenseCode(q));
      const [lic] = await db
        .select({ userId: licenses.userId })
        .from(licenses)
        .where(eq(licenses.codeHash, hash))
        .limit(1);
      if (lic?.userId) await addUser(lic.userId, "licentiecode");
    } catch {
      // ongeldige code-vorm → overslaan
    }
  }

  // Order-id (uuid).
  if (UUID_RE.test(q)) {
    const [o] = await db
      .select({ userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, q))
      .limit(1);
    if (o?.userId) await addUser(o.userId, "order-id");
  }

  // Apparaat-fingerprint.
  if (/^fp_/i.test(q)) {
    const [row] = await db
      .select({ userId: licenses.userId })
      .from(devices)
      .innerJoin(
        licenseActivations,
        eq(licenseActivations.deviceId, devices.id),
      )
      .innerJoin(licenses, eq(licenses.id, licenseActivations.licenseId))
      .where(eq(devices.fingerprint, q))
      .limit(1);
    if (row?.userId) await addUser(row.userId, "apparaat");
  }

  return Array.from(matches.values());
}
