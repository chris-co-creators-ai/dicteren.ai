// Dicteren.ai — Admin user-management view.
// Lijst van auth.user-records met extra context (paid-licenses, orgs,
// last-session, banned-status, source) zodat /admin/users een operationeel
// account-paneel voor KLANTEN is — staff zit standaard verborgen en leeft
// in /admin/settings/staff. Toggle via opts.includeStaff voor admin-need.

import "server-only";
import { and, desc, eq, inArray, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import { db, dbAuth } from "@/lib/db";
import {
  authMember,
  authOrg,
  authSession,
  authUser,
} from "@/lib/db/auth-schema";
import {
  affiliateReferrals,
  affiliates,
  licenses,
  subscriptions,
  userAttribution,
} from "@/lib/db/schema";

const STAFF_ROLES = ["admin", "account_manager"] as const;

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
  /** Signup-segment (migratie 0044): 'personal' = voor zichzelf, 'business' = voor een team. */
  accountType: "personal" | "business" | null;
  paidLicenseCount: number;
  organizations: Array<{ id: string; name: string; role: string }>;
  /** Raw context for client-side deriveCustomerSource() — keeps SSOT in lib/services/customerSource. */
  latestLicenseSource: string | null;
  latestLicenseType: "beta" | "consumer" | "team" | "partner" | null;
  hasAffiliateReferral: boolean;
  affiliateName: string | null;
  /** First-touch campagne uit user_attribution — "google"/"cpc" bij Google Ads. */
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** Actieve (niet-geannuleerde) abonnementen — voor de opzeg-actie in de dropdown. */
  activeSubscriptionId: string | null;
  activeSubscriptionCount: number;
};

export async function listAdminUsers(
  opts: { includeStaff?: boolean } = {},
): Promise<AdminUserRow[]> {
  // 1. Users + ban-velden uit auth.user.
  //    Default: verberg staff (admin/account_manager) — die leven in /admin/settings/staff.
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
      accountType: authUser.accountType,
    })
    .from(authUser)
    .where(
      opts.includeStaff
        ? undefined
        : or(
            isNull(authUser.role),
            notInArray(authUser.role, STAFF_ROLES as unknown as string[]),
          ),
    )
    .orderBy(desc(authUser.createdAt));

  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);

  // 2. Last session per user — MAX(createdAt) per userId.
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

  // 5. Latest license per user (voor source-derivation).
  const allLicenses = await db
    .select({
      userId: licenses.userId,
      source: licenses.source,
      type: licenses.type,
      issuedAt: licenses.issuedAt,
    })
    .from(licenses)
    .where(inArray(licenses.userId, ids));
  const latestLicByUser = new Map<
    string,
    { source: string | null; type: "beta" | "consumer" | "team" | "partner" }
  >();
  for (const l of allLicenses) {
    if (!l.userId) continue;
    const prev = latestLicByUser.get(l.userId);
    if (!prev || l.issuedAt.getTime() > 0) {
      // Keep latest by issuedAt — overwrite if newer.
      const existing = latestLicByUser.get(l.userId);
      if (!existing) {
        latestLicByUser.set(l.userId, { source: l.source, type: l.type });
      }
    }
  }
  // Second pass: pick truly latest (Drizzle returns unordered for inArray batch).
  const latestByUserCorrect = new Map<
    string,
    { source: string | null; type: "beta" | "consumer" | "team" | "partner"; issuedAt: Date }
  >();
  for (const l of allLicenses) {
    if (!l.userId) continue;
    const prev = latestByUserCorrect.get(l.userId);
    if (!prev || l.issuedAt > prev.issuedAt) {
      latestByUserCorrect.set(l.userId, {
        source: l.source,
        type: l.type,
        issuedAt: l.issuedAt,
      });
    }
  }

  // 6. Affiliate-referral per user (lifetime first-touch).
  const refRows = await db
    .select({
      userId: affiliateReferrals.userId,
      affiliateName: affiliates.name,
    })
    .from(affiliateReferrals)
    .innerJoin(affiliates, eq(affiliates.id, affiliateReferrals.affiliateId))
    .where(inArray(affiliateReferrals.userId, ids));
  const refByUser = new Map(
    refRows.map((r) => [r.userId, r.affiliateName ?? null]),
  );

  // 7. Actieve abonnementen per user (voor de directe opzeg-actie in de dropdown).
  const subRows = await db
    .select({ id: subscriptions.id, userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.userId, ids),
        ne(subscriptions.status, "canceled"),
      ),
    );
  const subsByUser = new Map<string, string[]>();
  for (const s of subRows) {
    if (!s.userId) continue;
    const arr = subsByUser.get(s.userId) ?? [];
    arr.push(s.id);
    subsByUser.set(s.userId, arr);
  }

  // 8. First-touch attributie (UTM/gclid) — bepaalt of iemand via een
  //    advertentie binnenkwam. Faalt stil zolang de migratie nog niet draait.
  const attrByUser = new Map<
    string,
    { source: string | null; medium: string | null; campaign: string | null }
  >();
  try {
    const attrRows = await db
      .select({
        userId: userAttribution.userId,
        source: userAttribution.utmSource,
        medium: userAttribution.utmMedium,
        campaign: userAttribution.utmCampaign,
      })
      .from(userAttribution)
      .where(inArray(userAttribution.userId, ids));
    for (const a of attrRows) {
      attrByUser.set(a.userId, {
        source: a.source,
        medium: a.medium,
        campaign: a.campaign,
      });
    }
  } catch {
    // Tabel bestaat nog niet in deze omgeving — geen attributie, wel een lijst.
  }

  return users.map((u) => {
    const lic = latestByUserCorrect.get(u.id);
    const attr = attrByUser.get(u.id);
    return {
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
      accountType: (u.accountType as "personal" | "business" | null) ?? null,
      paidLicenseCount: licCountMap.get(u.id) ?? 0,
      organizations: orgsByUser.get(u.id) ?? [],
      latestLicenseSource: lic?.source ?? null,
      latestLicenseType: lic?.type ?? null,
      hasAffiliateReferral: refByUser.has(u.id),
      affiliateName: refByUser.get(u.id) ?? null,
      utmSource: attr?.source ?? null,
      utmMedium: attr?.medium ?? null,
      utmCampaign: attr?.campaign ?? null,
      activeSubscriptionId: subsByUser.get(u.id)?.[0] ?? null,
      activeSubscriptionCount: subsByUser.get(u.id)?.length ?? 0,
    };
  });
}
