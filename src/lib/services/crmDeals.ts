// Dicteren.ai — CRM B2B Deals service
//
// Centraal voor alles wat met crm_organizations, crm_contacts, crm_events en
// crm_org_tasks te maken heeft. Gebruikt door /admin/crm (Organisaties-tab) en
// de webhooks die self-service / consumer-upgrade routes naar dezelfde tabel
// routeren.

import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmContacts,
  crmEvents,
  crmOrganizations,
  crmOrgTasks,
  type CrmContact,
  type CrmEvent,
  type CrmOrganization,
  type CrmOrgTask,
  type NewCrmContact,
  type NewCrmEvent,
  type NewCrmOrganization,
  type NewCrmOrgTask,
} from "@/lib/db/schema/crmDeals";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { logEvent } from "./audit";

// ───── Organizations ─────

export type CrmOrgListItem = CrmOrganization & {
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  ownerName: string | null;
  contactCount: number;
  openTaskCount: number;
};

export async function listCrmOrganizations(): Promise<CrmOrgListItem[]> {
  const rows = await db
    .select({
      org: crmOrganizations,
      ownerName: authUsers.name,
    })
    .from(crmOrganizations)
    .leftJoin(authUsers, eq(authUsers.id, crmOrganizations.accountOwnerId))
    .orderBy(desc(crmOrganizations.updatedAt));

  if (rows.length === 0) return [];

  const orgIds = rows.map((r) => r.org.id);

  // Primaire contacten ophalen (één query)
  const primaryContactRows = await db
    .select()
    .from(crmContacts)
    .where(
      and(
        inArray(crmContacts.crmOrganizationId, orgIds),
        eq(crmContacts.isPrimary, true),
      ),
    );
  const primaryByOrg = new Map<string, CrmContact>();
  for (const c of primaryContactRows) {
    if (c.crmOrganizationId) primaryByOrg.set(c.crmOrganizationId, c);
  }

  // Contact-counts
  const contactCountRows = await db
    .select({
      orgId: crmContacts.crmOrganizationId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(crmContacts)
    .where(inArray(crmContacts.crmOrganizationId, orgIds))
    .groupBy(crmContacts.crmOrganizationId);
  const contactCountByOrg = new Map<string, number>();
  for (const r of contactCountRows) {
    if (r.orgId) contactCountByOrg.set(r.orgId, r.count);
  }

  // Open-task counts
  const taskCountRows = await db
    .select({
      orgId: crmOrgTasks.crmOrganizationId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(crmOrgTasks)
    .where(
      and(
        inArray(crmOrgTasks.crmOrganizationId, orgIds),
        isNull(crmOrgTasks.completedAt),
        isNull(crmOrgTasks.deletedAt),
      ),
    )
    .groupBy(crmOrgTasks.crmOrganizationId);
  const taskCountByOrg = new Map<string, number>();
  for (const r of taskCountRows) {
    taskCountByOrg.set(r.orgId, r.count);
  }

  return rows.map((r) => {
    const primary = primaryByOrg.get(r.org.id);
    return {
      ...r.org,
      primaryContactName: primary?.name ?? null,
      primaryContactEmail: primary?.email ?? null,
      ownerName: r.ownerName ?? null,
      contactCount: contactCountByOrg.get(r.org.id) ?? 0,
      openTaskCount: taskCountByOrg.get(r.org.id) ?? 0,
    };
  });
}

export async function getCrmOrganization(
  id: string,
): Promise<CrmOrganization | null> {
  const [row] = await db
    .select()
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCrmOrganization(args: {
  data: NewCrmOrganization;
  actorUserId: string;
}): Promise<CrmOrganization> {
  const [row] = await db
    .insert(crmOrganizations)
    .values(args.data)
    .returning();

  await db.insert(crmEvents).values({
    crmOrganizationId: row.id,
    actorUserId: args.actorUserId,
    kind: "created",
    payload: {
      source: row.source,
      status: row.status,
      name: row.name,
    },
  });

  await logEvent({
    action: "crm_org.created",
    entityType: "crm_organization",
    entityId: row.id,
    actorId: args.actorUserId,
    metadata: { source: row.source, name: row.name },
  });

  return row;
}

export async function updateCrmOrganization(args: {
  id: string;
  patch: Partial<NewCrmOrganization>;
  actorUserId: string;
}): Promise<CrmOrganization | null> {
  // Eerst huidige status pakken voor status_changed-event
  const before = await getCrmOrganization(args.id);
  if (!before) return null;

  const [row] = await db
    .update(crmOrganizations)
    .set({ ...args.patch, updatedAt: new Date() })
    .where(eq(crmOrganizations.id, args.id))
    .returning();
  if (!row) return null;

  // Status-change event
  if (args.patch.status && args.patch.status !== before.status) {
    await db.insert(crmEvents).values({
      crmOrganizationId: row.id,
      actorUserId: args.actorUserId,
      kind: "status_changed",
      payload: { from: before.status, to: args.patch.status },
    });
  } else {
    // Algemeen field_updated event met diff
    const changed: Record<string, { from: unknown; to: unknown }> = {};
    for (const [k, v] of Object.entries(args.patch)) {
      const beforeVal = (before as unknown as Record<string, unknown>)[k];
      if (beforeVal !== v) {
        changed[k] = { from: beforeVal ?? null, to: v ?? null };
      }
    }
    if (Object.keys(changed).length > 0) {
      await db.insert(crmEvents).values({
        crmOrganizationId: row.id,
        actorUserId: args.actorUserId,
        kind: "field_updated",
        payload: { changed },
      });
    }
  }

  return row;
}

export async function deleteCrmOrganization(id: string): Promise<boolean> {
  const result = await db
    .delete(crmOrganizations)
    .where(eq(crmOrganizations.id, id))
    .returning({ id: crmOrganizations.id });
  return result.length > 0;
}

// ───── Contacts ─────

export async function listContactsForOrg(
  orgId: string,
): Promise<CrmContact[]> {
  return db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.crmOrganizationId, orgId))
    .orderBy(desc(crmContacts.isPrimary), desc(crmContacts.createdAt));
}

export async function addCrmContact(args: {
  data: NewCrmContact;
  actorUserId: string;
}): Promise<CrmContact> {
  // Als is_primary=true: alle andere contacten van deze org op false zetten
  if (args.data.isPrimary && args.data.crmOrganizationId) {
    await db
      .update(crmContacts)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(crmContacts.crmOrganizationId, args.data.crmOrganizationId));
  }

  const [row] = await db.insert(crmContacts).values(args.data).returning();

  if (row.crmOrganizationId) {
    await db.insert(crmEvents).values({
      crmOrganizationId: row.crmOrganizationId,
      crmContactId: row.id,
      actorUserId: args.actorUserId,
      kind: "contact_added",
      payload: { name: row.name, email: row.email },
    });
  }

  return row;
}

export async function updateCrmContact(args: {
  id: string;
  patch: Partial<NewCrmContact>;
  actorUserId: string;
}): Promise<CrmContact | null> {
  // Primary-flip: andere contacten van zelfde org resetten
  if (args.patch.isPrimary === true) {
    const [existing] = await db
      .select({ orgId: crmContacts.crmOrganizationId })
      .from(crmContacts)
      .where(eq(crmContacts.id, args.id))
      .limit(1);
    if (existing?.orgId) {
      await db
        .update(crmContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(crmContacts.crmOrganizationId, existing.orgId));
    }
  }

  const [row] = await db
    .update(crmContacts)
    .set({ ...args.patch, updatedAt: new Date() })
    .where(eq(crmContacts.id, args.id))
    .returning();
  return row ?? null;
}

export async function deleteCrmContact(
  id: string,
  actorUserId: string,
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.id, id))
    .limit(1);
  if (!existing) return false;

  await db.delete(crmContacts).where(eq(crmContacts.id, id));

  if (existing.crmOrganizationId) {
    await db.insert(crmEvents).values({
      crmOrganizationId: existing.crmOrganizationId,
      actorUserId,
      kind: "contact_removed",
      payload: { name: existing.name, email: existing.email },
    });
  }

  return true;
}

export async function getPrimaryContact(
  orgId: string,
): Promise<CrmContact | null> {
  const [row] = await db
    .select()
    .from(crmContacts)
    .where(
      and(
        eq(crmContacts.crmOrganizationId, orgId),
        eq(crmContacts.isPrimary, true),
      ),
    )
    .limit(1);
  if (row) return row;
  // Fallback: eerste contact van de org
  const [first] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.crmOrganizationId, orgId))
    .orderBy(desc(crmContacts.createdAt))
    .limit(1);
  return first ?? null;
}

// ───── Events / timeline ─────

export async function logCrmEvent(args: NewCrmEvent): Promise<void> {
  await db.insert(crmEvents).values(args);
}

export type CrmTimelineItem = CrmEvent & {
  actorName: string | null;
};

export async function listEventsForOrg(
  orgId: string,
  limit = 100,
): Promise<CrmTimelineItem[]> {
  const rows = await db
    .select({
      event: crmEvents,
      actorName: authUsers.name,
    })
    .from(crmEvents)
    .leftJoin(authUsers, eq(authUsers.id, crmEvents.actorUserId))
    .where(eq(crmEvents.crmOrganizationId, orgId))
    .orderBy(desc(crmEvents.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.event, actorName: r.actorName ?? null }));
}

// ───── Tasks ─────

export async function listTasksForOrg(
  orgId: string,
): Promise<CrmOrgTask[]> {
  return db
    .select()
    .from(crmOrgTasks)
    .where(
      and(
        eq(crmOrgTasks.crmOrganizationId, orgId),
        isNull(crmOrgTasks.deletedAt),
      ),
    )
    .orderBy(desc(crmOrgTasks.createdAt));
}

export async function addCrmOrgTask(args: {
  data: NewCrmOrgTask;
  actorUserId: string;
}): Promise<CrmOrgTask> {
  const [row] = await db.insert(crmOrgTasks).values(args.data).returning();
  await db.insert(crmEvents).values({
    crmOrganizationId: row.crmOrganizationId,
    actorUserId: args.actorUserId,
    kind: "task_added",
    payload: { title: row.title, kind: row.kind, dueAt: row.dueAt },
  });
  return row;
}

export async function completeCrmOrgTask(
  taskId: string,
  actorUserId: string,
): Promise<CrmOrgTask | null> {
  const [row] = await db
    .update(crmOrgTasks)
    .set({ completedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(crmOrgTasks.id, taskId), isNull(crmOrgTasks.completedAt)),
    )
    .returning();
  if (!row) return null;
  await db.insert(crmEvents).values({
    crmOrganizationId: row.crmOrganizationId,
    actorUserId,
    kind: "task_completed",
    payload: { title: row.title },
  });
  return row;
}

export async function deleteCrmOrgTask(taskId: string): Promise<boolean> {
  const result = await db
    .update(crmOrgTasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(crmOrgTasks.id, taskId))
    .returning({ id: crmOrgTasks.id });
  return result.length > 0;
}

// ───── KPI's voor /admin/crm header en /admin overzicht ─────

export type CrmDealsKpis = {
  totalOrgs: number;
  openDeals: number;     // niet won/lost
  proposalsOut: number;  // status=proposal_sent
  wonThisMonth: number;
  totalForecastCents: number;
};

export async function crmDealsKpis(): Promise<CrmDealsKpis> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations);

  const [open] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations)
    .where(
      and(
        sql`${crmOrganizations.status} NOT IN ('won', 'lost')`,
      ),
    );

  const [proposals] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.status, "proposal_sent"));

  const [won] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations)
    .where(
      and(
        eq(crmOrganizations.status, "won"),
        isNotNull(crmOrganizations.paidAt),
        sql`${crmOrganizations.paidAt} >= ${startOfMonth.toISOString()}`,
      ),
    );

  const [forecast] = await db
    .select({
      sum: sql<number>`coalesce(sum(${crmOrganizations.proposedAmountCents}),0)::int`,
    })
    .from(crmOrganizations)
    .where(
      and(
        sql`${crmOrganizations.status} NOT IN ('won', 'lost')`,
        isNotNull(crmOrganizations.proposedAmountCents),
      ),
    );

  return {
    totalOrgs: total?.count ?? 0,
    openDeals: open?.count ?? 0,
    proposalsOut: proposals?.count ?? 0,
    wonThisMonth: won?.count ?? 0,
    totalForecastCents: forecast?.sum ?? 0,
  };
}

// ───── Lookup helpers voor webhook + checkout-routes ─────

export async function findCrmOrgByPaymentLinkOrderId(
  orderId: string,
): Promise<CrmOrganization | null> {
  const [row] = await db
    .select()
    .from(crmOrganizations)
    .where(eq(crmOrganizations.paymentLinkOrderId, orderId))
    .limit(1);
  return row ?? null;
}

export async function findCrmOrgByAuthOrganizationId(
  authOrgId: string,
): Promise<CrmOrganization | null> {
  const [row] = await db
    .select()
    .from(crmOrganizations)
    .where(eq(crmOrganizations.authOrganizationId, authOrgId))
    .limit(1);
  return row ?? null;
}

/** Voor self-service B2B-checkout: bij eerste paid maken we een crm_organizations
 *  rij aan zodat het zichtbaar is in het CRM. Source=self_service, status=won
 *  direct want betaling is al binnen. */
export async function upsertCrmOrgFromAuthOrganization(args: {
  authOrganizationId: string;
  name: string;
  billing?: {
    vatNumber?: string | null;
    countryCode?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  source: "self_service" | "consumer_upgrade";
  primaryContactUserId?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  proposedSeats?: number;
  proposedAmountCents?: number;
  proposedPlanSlug?: string;
  paidAt?: Date | null;
}): Promise<CrmOrganization> {
  const existing = await findCrmOrgByAuthOrganizationId(args.authOrganizationId);
  if (existing) return existing;

  const [row] = await db
    .insert(crmOrganizations)
    .values({
      name: args.name,
      vatNumber: args.billing?.vatNumber ?? null,
      countryCode: args.billing?.countryCode ?? null,
      addressLine1: args.billing?.addressLine1 ?? null,
      addressLine2: args.billing?.addressLine2 ?? null,
      postalCode: args.billing?.postalCode ?? null,
      city: args.billing?.city ?? null,
      source: args.source,
      status: "won",
      authOrganizationId: args.authOrganizationId,
      proposedSeats: args.proposedSeats ?? null,
      proposedAmountCents: args.proposedAmountCents ?? null,
      proposedPlanSlug: args.proposedPlanSlug ?? null,
      paidAt: args.paidAt ?? new Date(),
    })
    .returning();

  // Primaire contact koppelen
  if (args.primaryContactEmail && args.primaryContactName) {
    await db.insert(crmContacts).values({
      crmOrganizationId: row.id,
      name: args.primaryContactName,
      email: args.primaryContactEmail,
      authUserId: args.primaryContactUserId ?? null,
      isPrimary: true,
    });
  }

  await db.insert(crmEvents).values({
    crmOrganizationId: row.id,
    kind: "created",
    payload: { source: row.source, via: "webhook-upsert" },
  });

  return row;
}
