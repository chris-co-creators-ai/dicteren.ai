import "server-only";
import {
  and,
  count,
  desc,
  eq,
  isNull,
  like,
  ne,
  notLike,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  affiliateReferrals,
  affiliates,
  authMembers,
  authOrganizations,
  authUsers,
  discountCodes,
  emailLogs,
  licenses,
  orders,
  organizationBilling,
  subscriptions,
  userBilling,
} from "@/lib/db/schema";
import type { LicenseType } from "@/lib/types";

/** Filter dat race-condition duplicate-trials uitsluit (artefact van
 *  trial-service dedupe-fix). Zelfde patroon als in services/account.ts. */
const NOT_RACE_DUPLICATE = or(
  isNull(licenses.notes),
  notLike(licenses.notes, "%Race-condition duplicate%"),
);

/**
 * Identity service — single source of truth for users/orgs/members reads.
 *
 * Reads pull from `neon_auth.*` (managed by Better Auth) and join optional
 * `public.organization_billing` for business data. Never write to neon_auth
 * directly — use authClient.signUp / admin plugin / org plugin instead.
 */

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  createdAt: Date;
  licenseCount: number;
};

export async function listCustomers(): Promise<CustomerRow[]> {
  // Pull all users + count of their licenses
  const users = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
      emailVerified: authUsers.emailVerified,
      createdAt: authUsers.createdAt,
    })
    .from(authUsers)
    .orderBy(desc(authUsers.createdAt));

  if (users.length === 0) return [];

  // Batch license counts per user
  const counts = await db
    .select({
      userId: licenses.userId,
      n: count(),
    })
    .from(licenses)
    .groupBy(licenses.userId);

  const byUser = new Map(counts.map((c) => [c.userId, c.n]));
  return users.map((u) => ({ ...u, licenseCount: byUser.get(u.id) ?? 0 }));
}

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  createdAt: Date;
  billingEmail: string | null;
  vatNumber: string | null;
  memberCount: number;
  licenseCount: number;
};

export async function listOrganizations(): Promise<OrganizationRow[]> {
  const orgs = await db
    .select({
      id: authOrganizations.id,
      name: authOrganizations.name,
      slug: authOrganizations.slug,
      logo: authOrganizations.logo,
      createdAt: authOrganizations.createdAt,
      billingEmail: organizationBilling.billingEmail,
      vatNumber: organizationBilling.vatNumber,
    })
    .from(authOrganizations)
    .leftJoin(
      organizationBilling,
      eq(organizationBilling.organizationId, authOrganizations.id),
    )
    .orderBy(desc(authOrganizations.createdAt));

  if (orgs.length === 0) return [];

  const [members, lic] = await Promise.all([
    db
      .select({ orgId: authMembers.organizationId, n: count() })
      .from(authMembers)
      .groupBy(authMembers.organizationId),
    db
      .select({ orgId: licenses.organizationId, n: count() })
      .from(licenses)
      .groupBy(licenses.organizationId),
  ]);

  const memberMap = new Map(members.map((m) => [m.orgId, m.n]));
  const licMap = new Map(lic.map((l) => [l.orgId, l.n]));

  return orgs.map((o) => ({
    ...o,
    memberCount: memberMap.get(o.id) ?? 0,
    licenseCount: licMap.get(o.id) ?? 0,
  }));
}

/** Counts for admin overview KPIs. */
export async function identityKpis() {
  const [
    [{ totalUsers }],
    [{ adminCount }],
    [{ verifiedCount }],
    [{ totalOrgs }],
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(authUsers),
    db
      .select({ adminCount: count() })
      .from(authUsers)
      .where(eq(authUsers.role, "admin")),
    db
      .select({ verifiedCount: count() })
      .from(authUsers)
      .where(eq(authUsers.emailVerified, true)),
    db.select({ totalOrgs: count() }).from(authOrganizations),
  ]);
  return { totalUsers, adminCount, verifiedCount, totalOrgs };
}

// ───── Trial-funnel view for /admin/crm ───────────────────────

export type CustomerSegment = "consumer" | "team" | "partner" | "trial" | "lead";

export type CustomerFunnelRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string | null;
  createdAt: Date;
  trialStartedAt: Date | null;
  trialExpiresAt: Date | null;
  trialStatus: string | null;
  paidLicenseCount: number;
  /** Segment afgeleid uit actieve license: team > consumer > partner > trial > lead. */
  segment: CustomerSegment;
  /** Type van laatste paid license (consumer/team/partner) — null voor lead/trial. */
  paidLicenseType: LicenseType | null;
  /** Source van laatste license (self-signup, partner:ORG-X, admin-grant, ...). */
  licenseSource: string | null;
  /** Discount-snapshot van laatste license (uit Mollie metadata bij issue). */
  discountType: string | null;
  discountValue: number | null;
  /** Mollie customer-id (uit user_billing), null = nooit in Mollie. */
  mollieCustomerId: string | null;
  /** Status van actieve Mollie subscription (active/canceled/...), null = geen. */
  subscriptionStatus: string | null;
  /** Volgende incasso (vanuit subscriptions tabel). */
  nextBillingAt: Date | null;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  /** Account owner = de affiliate-reseller die deze klant heeft aangedragen.
   *  Null = self-signup zonder ?ref=... of self-served door admin. */
  accountOwner: {
    affiliateId: string;
    code: string;
    name: string;
    convertedAt: Date | null;
  } | null;
  /** Discount-code die deze klant gebruikt heeft (laatste paid order).
   *  affiliateId is gezet als de code aan een reseller gekoppeld is. */
  discountCodeUsed: {
    id: string;
    code: string;
    affiliateId: string | null;
  } | null;
};

export type FunnelStage =
  | "lead"           // account, no trial yet
  | "trial_active"   // active trial license
  | "trial_expired"  // trial ended, no conversion
  | "converted";     // has at least one paid license

export function classifyStage(row: CustomerFunnelRow, now = Date.now()): FunnelStage {
  if (row.paidLicenseCount > 0) return "converted";
  if (!row.trialStartedAt) return "lead";
  const expired = row.trialExpiresAt && row.trialExpiresAt.getTime() < now;
  if (row.trialStatus === "active" && !expired) return "trial_active";
  return "trial_expired";
}

export async function listCustomerFunnel(): Promise<CustomerFunnelRow[]> {
  const users = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
      emailVerified: authUsers.emailVerified,
      createdAt: authUsers.createdAt,
    })
    .from(authUsers)
    .orderBy(desc(authUsers.createdAt));

  if (users.length === 0) return [];

  // Trial per user (latest non-race-dupe trial). Race-duplicates (revoked
  // door trial-service dedupe-fix) worden uitgefilterd zodat we de échte
  // active trial krijgen, niet de microseconde-later geïssuede dupe.
  const trialRows = await db
    .select({
      userId: licenses.userId,
      issuedAt: licenses.issuedAt,
      expiresAt: licenses.expiresAt,
      status: licenses.status,
    })
    .from(licenses)
    .where(and(like(licenses.code, "DIC-TRIAL-%"), NOT_RACE_DUPLICATE));

  const trialByUser = new Map<
    string,
    { issuedAt: Date; expiresAt: Date | null; status: string }
  >();
  for (const t of trialRows) {
    if (!t.userId) continue;
    const prev = trialByUser.get(t.userId);
    if (!prev || t.issuedAt > prev.issuedAt) {
      trialByUser.set(t.userId, {
        issuedAt: t.issuedAt,
        expiresAt: t.expiresAt,
        status: t.status,
      });
    }
  }

  // Paid license count per user — telt alleen échte consumer/team aankopen.
  // Sluit uit: trials (DIC-TRIAL-*), partner-licenses (type=partner, anoniem
  // gebruikt door stichting-leden, niet user-conversies) en race-duplicates.
  const paidCounts = await db
    .select({
      userId: licenses.userId,
      n: count(),
    })
    .from(licenses)
    .where(
      and(
        notLike(licenses.code, "DIC-TRIAL-%"),
        ne(licenses.type, "partner"),
        NOT_RACE_DUPLICATE,
      ),
    )
    .groupBy(licenses.userId);
  const paidByUser = new Map(paidCounts.map((p) => [p.userId, p.n]));

  // Snapshot van laatste paid license per user (type / source / discount).
  const paidLicenseRows = await db
    .select({
      userId: licenses.userId,
      type: licenses.type,
      source: licenses.source,
      discountType: licenses.discountType,
      discountValue: licenses.discountValue,
      issuedAt: licenses.issuedAt,
    })
    .from(licenses)
    .where(and(notLike(licenses.code, "DIC-TRIAL-%"), NOT_RACE_DUPLICATE));
  const paidLicenseByUser = new Map<
    string,
    {
      type: LicenseType;
      source: string | null;
      discountType: string | null;
      discountValue: number | null;
    }
  >();
  for (const r of paidLicenseRows) {
    if (!r.userId) continue;
    const prev = paidLicenseByUser.get(r.userId);
    const ordering: Record<LicenseType, number> = {
      team: 4,
      consumer: 3,
      partner: 2,
      beta: 1,
    };
    if (!prev || ordering[r.type] > ordering[prev.type]) {
      paidLicenseByUser.set(r.userId, {
        type: r.type,
        source: r.source ?? null,
        discountType: r.discountType ?? null,
        discountValue: r.discountValue ?? null,
      });
    }
  }

  // Mollie customer-id per user (uit user_billing).
  const billingRows = await db
    .select({
      userId: userBilling.userId,
      mollieCustomerId: userBilling.mollieCustomerId,
    })
    .from(userBilling);
  const mollieByUser = new Map(
    billingRows.map((b) => [b.userId, b.mollieCustomerId ?? null]),
  );

  // Actieve / past_due subscription per user.
  const subRows = await db
    .select({
      userId: subscriptions.userId,
      status: subscriptions.status,
      nextBillingAt: subscriptions.nextBillingAt,
    })
    .from(subscriptions);
  const subByUser = new Map<
    string,
    { status: string; nextBillingAt: Date | null }
  >();
  for (const s of subRows) {
    if (!s.userId) continue;
    const prev = subByUser.get(s.userId);
    // active > past_due > canceled > anders
    const rank = (st: string) =>
      st === "active" ? 4 : st === "past_due" ? 3 : st === "canceled" ? 2 : 1;
    if (!prev || rank(s.status) > rank(prev.status)) {
      subByUser.set(s.userId, {
        status: s.status,
        nextBillingAt: s.nextBillingAt,
      });
    }
  }

  // Account owner per user — JOIN op affiliate_referrals + affiliates.
  // First-touch lifetime attributie (uniek op userId in referrals-tabel).
  const ownerRows = await db
    .select({
      userId: affiliateReferrals.userId,
      affiliateId: affiliates.id,
      code: affiliates.code,
      name: affiliates.name,
      convertedAt: affiliateReferrals.convertedAt,
    })
    .from(affiliateReferrals)
    .innerJoin(affiliates, eq(affiliates.id, affiliateReferrals.affiliateId));
  const ownerByUser = new Map<
    string,
    {
      affiliateId: string;
      code: string;
      name: string;
      convertedAt: Date | null;
    }
  >();
  for (const o of ownerRows) {
    ownerByUser.set(o.userId, {
      affiliateId: o.affiliateId,
      code: o.code,
      name: o.name,
      convertedAt: o.convertedAt,
    });
  }

  // Discount-code per user — latest order met een discount-code wint.
  // Lifetime-stijl: we tonen de meest recente, want klant kan meerdere
  // orders met verschillende codes hebben.
  const discountRows = await db
    .select({
      userId: orders.userId,
      orderCreatedAt: orders.createdAt,
      id: discountCodes.id,
      code: discountCodes.code,
      affiliateId: discountCodes.affiliateId,
    })
    .from(orders)
    .innerJoin(discountCodes, eq(discountCodes.id, orders.discountCodeId))
    .orderBy(desc(orders.createdAt));
  const discountByUser = new Map<
    string,
    { id: string; code: string; affiliateId: string | null }
  >();
  for (const d of discountRows) {
    if (!d.userId) continue;
    if (!discountByUser.has(d.userId)) {
      discountByUser.set(d.userId, {
        id: d.id,
        code: d.code,
        affiliateId: d.affiliateId,
      });
    }
  }

  // Email aggregates per user
  const emailAgg = await db
    .select({
      userId: emailLogs.userId,
      sent: count(),
      opened: sql<number>`count(*) filter (where ${emailLogs.status} in ('opened','clicked'))`,
      clicked: sql<number>`count(*) filter (where ${emailLogs.status} = 'clicked')`,
      bounced: sql<number>`count(*) filter (where ${emailLogs.status} in ('bounced','complained'))`,
    })
    .from(emailLogs)
    .groupBy(emailLogs.userId);
  const emailByUser = new Map(
    emailAgg.map((e) => [
      e.userId,
      {
        sent: Number(e.sent),
        opened: Number(e.opened),
        clicked: Number(e.clicked),
        bounced: Number(e.bounced),
      },
    ]),
  );

  return users.map((u) => {
    const t = trialByUser.get(u.id);
    const em = emailByUser.get(u.id);
    const paidLic = paidLicenseByUser.get(u.id) ?? null;
    const sub = subByUser.get(u.id) ?? null;
    const paidCount = paidByUser.get(u.id) ?? 0;

    let segment: CustomerSegment;
    if (paidLic?.type === "team") segment = "team";
    else if (paidLic?.type === "consumer") segment = "consumer";
    else if (paidLic?.type === "partner") segment = "partner";
    else if (t?.status === "active") segment = "trial";
    else segment = "lead";

    return {
      ...u,
      trialStartedAt: t?.issuedAt ?? null,
      trialExpiresAt: t?.expiresAt ?? null,
      trialStatus: t?.status ?? null,
      paidLicenseCount: paidCount,
      segment,
      paidLicenseType: paidLic?.type ?? null,
      licenseSource: paidLic?.source ?? null,
      discountType: paidLic?.discountType ?? null,
      discountValue: paidLic?.discountValue ?? null,
      mollieCustomerId: mollieByUser.get(u.id) ?? null,
      subscriptionStatus: sub?.status ?? null,
      nextBillingAt: sub?.nextBillingAt ?? null,
      emailsSent: em?.sent ?? 0,
      emailsOpened: em?.opened ?? 0,
      emailsClicked: em?.clicked ?? 0,
      emailsBounced: em?.bounced ?? 0,
      accountOwner: ownerByUser.get(u.id) ?? null,
      discountCodeUsed: discountByUser.get(u.id) ?? null,
    };
  });
}

export async function funnelStageCounts(): Promise<Record<FunnelStage, number>> {
  const rows = await listCustomerFunnel();
  const counts: Record<FunnelStage, number> = {
    lead: 0,
    trial_active: 0,
    trial_expired: 0,
    converted: 0,
  };
  for (const r of rows) {
    counts[classifyStage(r)]++;
  }
  return counts;
}
