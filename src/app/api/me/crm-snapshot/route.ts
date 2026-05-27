// Dicteren.ai — GET /api/me/crm-snapshot
//
// Eigen pijplijn-snapshot voor de AM-boot-sequence. Geeft counts + recente
// namen van alle 5 contact-bronnen voor de huidige user. Admin krijgt
// over alle data.

import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { requireScopedAm } from "@/lib/auth/session";
import {
  crmContacts,
  crmOrganizations,
} from "@/lib/db/schema/crmDeals";
import { partnerOrganizations } from "@/lib/db/schema/partner";
import { customerAttributes } from "@/lib/db/schema/crm";

const RECENT_LIMIT = 5;

export async function GET() {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { ownerUserId, isAdmin } = guard;

  // CRM-organizations
  const orgs = await db
    .select({
      id: crmOrganizations.id,
      name: crmOrganizations.name,
      status: crmOrganizations.status,
      createdAt: crmOrganizations.createdAt,
    })
    .from(crmOrganizations)
    .where(
      isAdmin
        ? sql`TRUE`
        : eq(crmOrganizations.accountOwnerId, ownerUserId!),
    )
    .orderBy(desc(crmOrganizations.createdAt))
    .limit(RECENT_LIMIT);

  const [{ orgsTotal }] = await db
    .select({
      orgsTotal: sql<number>`count(*)::int`.as("orgs_total"),
    })
    .from(crmOrganizations)
    .where(
      isAdmin
        ? sql`TRUE`
        : eq(crmOrganizations.accountOwnerId, ownerUserId!),
    );

  // CRM-contacts (via org-koppeling)
  const [{ contactsTotal }] = await db
    .select({
      contactsTotal: sql<number>`count(*)::int`.as("contacts_total"),
    })
    .from(crmContacts)
    .leftJoin(
      crmOrganizations,
      eq(crmOrganizations.id, crmContacts.crmOrganizationId),
    )
    .where(
      isAdmin
        ? sql`TRUE`
        : eq(crmOrganizations.accountOwnerId, ownerUserId!),
    );

  // Partner-organizations (account_owner is text, niet user-id — voor AM toon
  // alleen als account_owner-text overeenkomt met humanName; voor MVP doen we
  // geen filter en tonen we 0 voor non-admin)
  const [{ partnersTotal }] = await db
    .select({
      partnersTotal: sql<number>`count(*)::int`.as("partners_total"),
    })
    .from(partnerOrganizations);

  // Customer-attributes (consumer-CRM, assigned_to_user_id)
  const [{ assignedCustomers }] = await db
    .select({
      assignedCustomers: sql<number>`count(*)::int`.as("assigned_customers"),
    })
    .from(customerAttributes)
    .where(
      isAdmin
        ? isNotNull(customerAttributes.assignedToUserId)
        : eq(customerAttributes.assignedToUserId, ownerUserId!),
    );

  return NextResponse.json({
    success: true,
    data: {
      scope: isAdmin ? "all" : "own",
      counts: {
        organizations: orgsTotal ?? 0,
        contacts: contactsTotal ?? 0,
        assignedCustomers: assignedCustomers ?? 0,
        partners: isAdmin ? partnersTotal ?? 0 : null,
      },
      recentOrganizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    },
  });
}
