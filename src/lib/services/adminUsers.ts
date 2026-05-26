// Dicteren.ai — Admin user-management view.
// Lijst van alle auth.user-records met extra context (paid-licenses, orgs,
// last-session, banned-status) zodat /admin/users een operationeel
// account-paneel is — los van CRM-pipeline.

import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import {
  authMember,
  authOrg,
  authSession,
  authUser,
} from "@/lib/db/auth-schema";
import { licenses } from "@/lib/db/schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  lastSessionAt: Date | null;
  paidLicenseCount: number;
  organizations: Array<{ id: string; name: string; role: string }>;
};

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  // 1. Users + ban-velden uit auth.user.
  const users = await dbAuth
    .select({
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
      emailVerified: authUser.emailVerified,
      banned: authUser.banned,
      banReason: authUser.banReason,
      banExpires: authUser.banExpires,
      createdAt: authUser.createdAt,
    })
    .from(authUser)
    .orderBy(desc(authUser.createdAt));

  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);

  // 2. Last session per user — MAX(createdAt) per userId.
  // sql-aggregaten komen als string terug uit pg; expliciet naar Date casten
  // anders crasht .toISOString() in de page-mapper.
  const sessions = await dbAuth
    .select({
      userId: authSession.userId,
      lastAt: sql<string>`max(${authSession.createdAt})`.as("last_at"),
    })
    .from(authSession)
    .where(inArray(authSession.userId, ids))
    .groupBy(authSession.userId);
  const lastSessionMap = new Map<string, Date | null>(
    sessions.map((s) => [
      s.userId,
      s.lastAt ? new Date(s.lastAt as unknown as string) : null,
    ]),
  );

  // 3. Org-memberships.
  const memberships = await dbAuth
    .select({
      userId: authMember.userId,
      orgId: authOrg.id,
      orgName: authOrg.name,
      role: authMember.role,
    })
    .from(authMember)
    .innerJoin(authOrg, eq(authOrg.id, authMember.organizationId))
    .where(inArray(authMember.userId, ids));
  const orgsByUser = new Map<
    string,
    Array<{ id: string; name: string; role: string }>
  >();
  for (const m of memberships) {
    const prev = orgsByUser.get(m.userId) ?? [];
    prev.push({ id: m.orgId, name: m.orgName, role: m.role });
    orgsByUser.set(m.userId, prev);
  }

  // 4. Paid-license count.
  const licCounts = await db
    .select({
      userId: licenses.userId,
      n: sql<number>`count(*)::int`,
    })
    .from(licenses)
    .where(
      and(
        sql`${licenses.code} not like 'DIC-TRIAL-%'`,
        eq(licenses.status, "active"),
      ),
    )
    .groupBy(licenses.userId);
  const licCountMap = new Map(licCounts.map((l) => [l.userId, l.n]));

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
    banned: u.banned ?? false,
    banReason: u.banReason,
    banExpires: u.banExpires,
    createdAt: u.createdAt,
    lastSessionAt: lastSessionMap.get(u.id) ?? null,
    paidLicenseCount: licCountMap.get(u.id) ?? 0,
    organizations: orgsByUser.get(u.id) ?? [],
  }));
}
