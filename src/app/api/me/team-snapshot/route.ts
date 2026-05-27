// Dicteren.ai — GET /api/me/team-snapshot
//
// Geeft counts + recente namen van collega's hun pijplijn. Doel: AM-boot
// kan duplicaten herkennen vóór create ("Brian heeft ook al deze klant").
// Geen volledige data, alleen summary.

import { NextResponse } from "next/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { crmOrganizations } from "@/lib/db/schema/crmDeals";

const RECENT_LIMIT_PER_TEAM = 3;

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  // Alle andere humans met rol admin of account_manager
  const teamRows = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
      assistantName: authUsers.assistantName,
    })
    .from(authUsers)
    .where(
      and(
        ne(authUsers.id, session.user.id),
        sql`role IN ('admin','account_manager')`,
      ),
    );

  const teamMembers = await Promise.all(
    teamRows.map(async (t) => {
      const [{ orgCount }] = await db
        .select({
          orgCount: sql<number>`count(*)::int`.as("org_count"),
        })
        .from(crmOrganizations)
        .where(eq(crmOrganizations.accountOwnerId, t.id));

      const recent = await db
        .select({
          id: crmOrganizations.id,
          name: crmOrganizations.name,
        })
        .from(crmOrganizations)
        .where(eq(crmOrganizations.accountOwnerId, t.id))
        .orderBy(desc(crmOrganizations.createdAt))
        .limit(RECENT_LIMIT_PER_TEAM);

      return {
        userId: t.id,
        humanName: t.name,
        assistantName: t.assistantName,
        role: t.role,
        organizationCount: orgCount ?? 0,
        recentOrganizationNames: recent.map((r) => r.name),
      };
    }),
  );

  return NextResponse.json({
    success: true,
    data: {
      teamMembers,
      totalTeamOrganizations: teamMembers.reduce(
        (sum, m) => sum + m.organizationCount,
        0,
      ),
    },
  });
}
