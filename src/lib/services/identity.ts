import "server-only";
import { count, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authMembers,
  authOrganizations,
  authUsers,
  emailLogs,
  licenses,
  organizationBilling,
} from "@/lib/db/schema";

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
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
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

  // Trial per user (latest by issuedAt)
  const trialRows = await db
    .select({
      userId: licenses.userId,
      issuedAt: licenses.issuedAt,
      expiresAt: licenses.expiresAt,
      status: licenses.status,
    })
    .from(licenses)
    .where(like(licenses.code, "DIC-TRIAL-%"));

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

  // Paid license count per user
  const paidCounts = await db
    .select({
      userId: licenses.userId,
      n: count(),
    })
    .from(licenses)
    .where(sql`${licenses.code} NOT LIKE 'DIC-TRIAL-%'`)
    .groupBy(licenses.userId);
  const paidByUser = new Map(paidCounts.map((p) => [p.userId, p.n]));

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
    return {
      ...u,
      trialStartedAt: t?.issuedAt ?? null,
      trialExpiresAt: t?.expiresAt ?? null,
      trialStatus: t?.status ?? null,
      paidLicenseCount: paidByUser.get(u.id) ?? 0,
      emailsSent: em?.sent ?? 0,
      emailsOpened: em?.opened ?? 0,
      emailsClicked: em?.clicked ?? 0,
      emailsBounced: em?.bounced ?? 0,
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
