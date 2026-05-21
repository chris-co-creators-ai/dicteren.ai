import "server-only";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authMembers,
  authOrganizations,
  authUsers,
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
