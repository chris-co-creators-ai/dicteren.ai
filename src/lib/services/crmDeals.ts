// Dicteren.ai — CRM B2B Deals service
//
// Centraal voor alles wat met crm_organizations, crm_contacts, crm_events en
// crm_org_tasks te maken heeft. Gebruikt door /admin/crm (Organisaties-tab) en
// de webhooks die self-service / consumer-upgrade routes naar dezelfde tabel
// routeren.

import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
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
import { licenses } from "@/lib/db/schema/licensing";
import { logEvent } from "./audit";
import { DISPOSITION_BY_KEY } from "./crmCallDisposition";

// ───── Organizations ─────

export type CrmOrgListItem = CrmOrganization & {
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  ownerName: string | null;
  contactCount: number;
  openTaskCount: number;
};

export async function listCrmOrganizations(
  opts: { accountOwnerId?: string | null } = {},
): Promise<CrmOrgListItem[]> {
  const rows = await db
    .select({
      org: crmOrganizations,
      ownerName: authUsers.name,
    })
    .from(crmOrganizations)
    .leftJoin(authUsers, eq(authUsers.id, crmOrganizations.accountOwnerId))
    .where(
      opts.accountOwnerId
        ? eq(crmOrganizations.accountOwnerId, opts.accountOwnerId)
        : undefined,
    )
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
    if (r.orgId) taskCountByOrg.set(r.orgId, r.count);
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

export async function getCrmContact(id: string): Promise<CrmContact | null> {
  const [row] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateCrmContact(args: {
  id: string;
  patch: Partial<NewCrmContact>;
  actorUserId: string;
}): Promise<CrmContact | null> {
  // Primary-flip: andere contacten van zelfde org resetten. Verhuist de patch
  // het contact tegelijk naar een (andere) org, reset dan op de DOEL-org —
  // anders houdt die org twee primaire contacten over.
  if (args.patch.isPrimary === true) {
    let targetOrgId = args.patch.crmOrganizationId ?? null;
    if (!targetOrgId) {
      const [existing] = await db
        .select({ orgId: crmContacts.crmOrganizationId })
        .from(crmContacts)
        .where(eq(crmContacts.id, args.id))
        .limit(1);
      targetOrgId = existing?.orgId ?? null;
    }
    if (targetOrgId) {
      await db
        .update(crmContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(crmContacts.crmOrganizationId, targetOrgId));
    }
  }

  const [row] = await db
    .update(crmContacts)
    .set({ ...args.patch, updatedAt: new Date() })
    .where(eq(crmContacts.id, args.id))
    .returning();
  return row ?? null;
}

/** Bulk-verwijderen van leads uit de Personen-tab. Twee soorten rijen:
 *  - prospects (crm_contacts) → hard delete via deleteCrmContact.
 *  - klanten (auth.user, bv. bot-signups) → alleen als ze NOOIT betaald hebben
 *    (geen licentie met een status anders dan 'trial'). Een (ex-)betalende klant
 *    wordt overgeslagen en geteld, zodat deze knop nooit per ongeluk een echte
 *    klant + zijn historie nukt. Bij verwijderen: eerst app-side opruimen
 *    (trial-licenties weg, owner-refs loskoppelen) om wezen te voorkomen; daarna
 *    de auth.user-rij (de auth.*-tabellen cascaden zelf). Admin-only aan de route. */
export async function bulkDeleteCrmPeople(args: {
  crmContactIds: string[];
  userIds: string[];
  actorUserId: string;
}): Promise<{ deletedContacts: number; deletedUsers: number; skippedPaid: number }> {
  let deletedContacts = 0;
  for (const id of args.crmContactIds) {
    if (await deleteCrmContact(id, args.actorUserId)) deletedContacts++;
  }

  let deletedUsers = 0;
  let skippedPaid = 0;
  for (const userId of args.userIds) {
    // Guard: heeft deze user ooit een niet-trial-licentie gehad? Dan is het een
    // (ex-)betalende klant — niet verwijderen via deze knop.
    const paid = await db
      .select({ id: licenses.id })
      .from(licenses)
      .where(and(eq(licenses.userId, userId), ne(licenses.status, "trial")))
      .limit(1);
    if (paid.length > 0) {
      skippedPaid++;
      continue;
    }

    // App-side opruimen (geen FK-cascade vanuit public naar auth.user).
    await db.delete(licenses).where(eq(licenses.userId, userId));
    await db
      .update(crmContacts)
      .set({ assignedToUserId: null })
      .where(eq(crmContacts.assignedToUserId, userId));
    await db
      .update(crmOrganizations)
      .set({ accountOwnerId: null })
      .where(eq(crmOrganizations.accountOwnerId, userId));

    await logEvent({
      action: "admin.action",
      entityType: "user",
      entityId: userId,
      actorId: args.actorUserId,
      metadata: { kind: "crm_lead_deleted" },
    });
    // auth.user weg → sessions/accounts/oauth-tokens cascaden automatisch.
    await db.delete(authUsers).where(eq(authUsers.id, userId));
    deletedUsers++;
  }

  return { deletedContacts, deletedUsers, skippedPaid };
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

/** Taken van één klant (auth.user) — polymorfe crm_org_tasks via auth_user_id. */
export async function listTasksForCustomer(
  userId: string,
): Promise<CrmOrgTask[]> {
  return db
    .select()
    .from(crmOrgTasks)
    .where(
      and(eq(crmOrgTasks.authUserId, userId), isNull(crmOrgTasks.deletedAt)),
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

/** Verwerk een call-center dispositie: log de interactie, zet (indien van toepassing)
 *  een vervolgtaak met datum, en werk de org bij (laatste dispositie, volgende actie,
 *  do-not-call / verkeerd-nummer-vlag). Raakt de stage nooit aan. */
export async function applyDisposition(args: {
  orgId: string;
  dispositionKey: string;
  dueAt?: Date | null; // alleen gebruikt bij dateMode 'am_choice'
  actorUserId: string;
}): Promise<{ taskId: string | null; nextActionAt: Date | null }> {
  const d = DISPOSITION_BY_KEY[args.dispositionKey];
  if (!d) throw new Error(`Onbekende dispositie: ${args.dispositionKey}`);

  // Opt-out-guard: een org op niet-bellen accepteert geen disposities meer.
  // De UI (lijst-kolom én Gesprek-tab) blokkeert dit al; dit is de server-gate.
  const [orgRow] = await db
    .select({ doNotCall: crmOrganizations.doNotCall })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.id, args.orgId))
    .limit(1);
  if (!orgRow) throw new Error("Organisatie niet gevonden");
  if (orgRow.doNotCall) {
    throw new Error("Organisatie staat op niet-bellen (opt-out)");
  }

  const now = new Date();

  // Due-datum van de vervolgtaak bepalen.
  let dueAt: Date | null = null;
  if (d.task !== "none") {
    if (d.dateMode === "auto") {
      dueAt = new Date(now);
      dueAt.setDate(dueAt.getDate() + (d.defaultDays ?? 0));
    } else if (d.dateMode === "am_choice") {
      dueAt = args.dueAt ?? null;
    }
  }

  // 1. Interactie loggen (timeline + touch).
  await db.insert(crmEvents).values({
    crmOrganizationId: args.orgId,
    actorUserId: args.actorUserId,
    kind: "interaction_logged",
    payload: { disposition: d.key, label: d.label, group: d.group, dueAt },
  });

  // 2. Vervolgtaak (bij callback/task/nurture).
  let taskId: string | null = null;
  if (d.task !== "none" && d.taskTitle) {
    const [task] = await db
      .insert(crmOrgTasks)
      .values({
        crmOrganizationId: args.orgId,
        title: d.taskTitle,
        kind: d.key,
        dueAt,
        createdByUserId: args.actorUserId,
      })
      .returning({ id: crmOrgTasks.id });
    taskId = task.id;
  }

  // 3. Org bijwerken: laatste dispositie, volgende actie + de vlaggen.
  const patch: Record<string, unknown> = {
    lastDisposition: d.key,
    lastDispositionAt: now,
    updatedAt: now,
  };
  if (d.task !== "none" && d.taskTitle) {
    patch.nextAction = d.taskTitle;
    patch.nextActionAt = dueAt;
  }
  if (d.flag === "do_not_call") patch.doNotCall = true;
  if (d.flag === "wrong_number") patch.wrongNumber = true;
  await db.update(crmOrganizations).set(patch).where(eq(crmOrganizations.id, args.orgId));

  return { taskId, nextActionAt: dueAt };
}

export type OrgDispositionState = {
  lastDisposition: string | null;
  lastDispositionAt: Date | null;
  nextAction: string | null;
  nextActionAt: Date | null;
  doNotCall: boolean;
  wrongNumber: boolean;
};

/** Batched: dispositie-/volgende-actie-state per organisatie (voor de CRM-lijst). */
export async function dispositionByOrgIds(
  orgIds: string[],
): Promise<Map<string, OrgDispositionState>> {
  const map = new Map<string, OrgDispositionState>();
  if (!orgIds.length) return map;
  const rows = await db
    .select({
      id: crmOrganizations.id,
      lastDisposition: crmOrganizations.lastDisposition,
      lastDispositionAt: crmOrganizations.lastDispositionAt,
      nextAction: crmOrganizations.nextAction,
      nextActionAt: crmOrganizations.nextActionAt,
      doNotCall: crmOrganizations.doNotCall,
      wrongNumber: crmOrganizations.wrongNumber,
    })
    .from(crmOrganizations)
    .where(inArray(crmOrganizations.id, orgIds));
  for (const r of rows) {
    map.set(r.id, {
      lastDisposition: r.lastDisposition,
      lastDispositionAt: r.lastDispositionAt,
      nextAction: r.nextAction,
      nextActionAt: r.nextActionAt,
      doNotCall: r.doNotCall,
      wrongNumber: r.wrongNumber,
    });
  }
  return map;
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

/** Vervaldatum (her)zetten op een open taak — elke taak hoort een datum te
 *  hebben voor opvolging; /admin/taken biedt hiervoor een inline zetter. */
export async function setCrmOrgTaskDueDate(
  taskId: string,
  dueAt: Date,
): Promise<CrmOrgTask | null> {
  const [row] = await db
    .update(crmOrgTasks)
    .set({ dueAt, updatedAt: new Date() })
    .where(
      and(
        eq(crmOrgTasks.id, taskId),
        isNull(crmOrgTasks.completedAt),
        isNull(crmOrgTasks.deletedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteCrmOrgTask(taskId: string): Promise<boolean> {
  const result = await db
    .update(crmOrgTasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(crmOrgTasks.id, taskId))
    .returning({ id: crmOrgTasks.id });
  return result.length > 0;
}

// ───── Open tasks per AM voor dashboard-widget ─────

export type OpenOrgTaskForUser = {
  taskId: string;
  title: string;
  kind: string;
  dueAt: Date | null;
  notes: string | null;
  orgId: string;
  orgName: string;
  authOrganizationId: string | null;
};

export type TaskDueRange = "overdue" | "today" | "tomorrow" | "later";

function rangeBounds(range: TaskDueRange): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfTomorrow = new Date(startOfDay);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  switch (range) {
    case "overdue":
      return { from: null, to: startOfDay };
    case "today":
      return { from: startOfDay, to: endOfDay };
    case "tomorrow":
      return { from: startOfTomorrow, to: endOfTomorrow };
    case "later":
      return { from: new Date(startOfTomorrow.getTime() + 86_400_000), to: null };
  }
}

/** Open taken (niet completed, niet deleted) van crm-orgs waar `userId` accountOwner is,
 *  optioneel gefilterd op due-range. Bedoeld voor /admin dashboard-widget. */
export async function listOpenOrgTasksForUser(args: {
  userId: string;
  range?: TaskDueRange;
  limit?: number;
}): Promise<OpenOrgTaskForUser[]> {
  const limit = args.limit ?? 50;
  const bounds = args.range ? rangeBounds(args.range) : null;

  const rows = await db
    .select({
      taskId: crmOrgTasks.id,
      title: crmOrgTasks.title,
      kind: crmOrgTasks.kind,
      dueAt: crmOrgTasks.dueAt,
      notes: crmOrgTasks.notes,
      orgId: crmOrganizations.id,
      orgName: crmOrganizations.name,
      authOrganizationId: crmOrganizations.authOrganizationId,
    })
    .from(crmOrgTasks)
    .innerJoin(
      crmOrganizations,
      eq(crmOrganizations.id, crmOrgTasks.crmOrganizationId),
    )
    .where(
      and(
        // Een taak is "van mij" als ik de org bezit OF de taak zelf aanmaakte.
        // Zo verdwijnt een taak die je op een andermans/ongetoewezen org maakt
        // niet uit je eigen /taken-lijst.
        or(
          eq(crmOrganizations.accountOwnerId, args.userId),
          eq(crmOrgTasks.createdByUserId, args.userId),
        ),
        isNull(crmOrgTasks.completedAt),
        isNull(crmOrgTasks.deletedAt),
      ),
    )
    .orderBy(crmOrgTasks.dueAt)
    .limit(limit);

  if (!bounds) return rows;

  return rows.filter((r) => {
    if (!r.dueAt) return false;
    const t = r.dueAt.getTime();
    if (bounds.from && t < bounds.from.getTime()) return false;
    if (bounds.to && t > bounds.to.getTime()) return false;
    return true;
  });
}

/** Auto-task aanmaker voor webhook-flow (Mollie-failures, refunds, etc).
 *  Lookup crm_organizations via authOrganizationId OF via licenseId.
 *  Skip silent als er geen crm-rij is (route 1 consumer-orders hebben geen crm-link). */
export async function autoTaskForOrgPaymentIssue(args: {
  authOrganizationId?: string | null;
  licenseId?: string | null;
  reason: "past_due" | "order_failed" | "order_canceled" | "refund";
  detail?: string | null;
  dueInDays?: number;
}): Promise<string | null> {
  let authOrgId = args.authOrganizationId ?? null;

  if (!authOrgId && args.licenseId) {
    const [lic] = await db
      .select({ organizationId: licenses.organizationId })
      .from(licenses)
      .where(eq(licenses.id, args.licenseId))
      .limit(1);
    authOrgId = lic?.organizationId ?? null;
  }
  if (!authOrgId) return null;

  const [org] = await db
    .select({
      id: crmOrganizations.id,
      accountOwnerId: crmOrganizations.accountOwnerId,
      name: crmOrganizations.name,
    })
    .from(crmOrganizations)
    .where(eq(crmOrganizations.authOrganizationId, authOrgId))
    .limit(1);
  if (!org) return null;

  const titleByReason: Record<typeof args.reason, string> = {
    past_due: `Bel ${org.name}: incasso mislukt`,
    order_failed: `Bel ${org.name}: betaling mislukt`,
    order_canceled: `Bel ${org.name}: betaling geannuleerd`,
    refund: `Bel ${org.name}: refund verwerkt`,
  };

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + (args.dueInDays ?? 1));
  dueAt.setHours(9, 0, 0, 0);

  const [task] = await db
    .insert(crmOrgTasks)
    .values({
      crmOrganizationId: org.id,
      title: titleByReason[args.reason],
      kind: "call",
      dueAt,
      notes: args.detail ?? null,
      createdByUserId: org.accountOwnerId,
    })
    .returning({ id: crmOrgTasks.id });

  await db.insert(crmEvents).values({
    crmOrganizationId: org.id,
    actorUserId: null,
    kind: "task_added",
    payload: {
      title: titleByReason[args.reason],
      kind: "call",
      auto: true,
      reason: args.reason,
      detail: args.detail,
    },
  });

  return task?.id ?? null;
}

// ───── KPI's voor /admin/crm header en /admin overzicht ─────

export type CrmDealsKpis = {
  totalOrgs: number;
  openDeals: number;     // niet won/lost
  proposalsOut: number;  // status=proposal_sent
  wonThisMonth: number;
  totalForecastCents: number;
};

export async function crmDealsKpis(ownerId?: string): Promise<CrmDealsKpis> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Scope op account-owner (AM ziet alleen eigen KPI's; admin = undefined = alles).
  const owner = ownerId
    ? eq(crmOrganizations.accountOwnerId, ownerId)
    : undefined;

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations)
    .where(owner);

  const [open] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations)
    .where(
      and(
        sql`${crmOrganizations.status} NOT IN ('won', 'lost')`,
        owner,
      ),
    );

  const [proposals] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations)
    .where(and(eq(crmOrganizations.status, "proposal_sent"), owner));

  const [won] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crmOrganizations)
    .where(
      and(
        eq(crmOrganizations.status, "won"),
        isNotNull(crmOrganizations.paidAt),
        sql`${crmOrganizations.paidAt} >= ${startOfMonth.toISOString()}`,
        owner,
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
        owner,
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
