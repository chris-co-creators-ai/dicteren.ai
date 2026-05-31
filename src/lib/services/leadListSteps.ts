// Dicteren.ai — Campagne-stappen per lead-lijst (cadence-builder service)
//
// De account-manager bouwt per lijst een eigen reeks stappen en kan ze
// aanmaken, bewerken, herordenen en verwijderen. Geen vaste automaat, geen
// outcome-branching. Timing is relatief: elke stap valt delay_days dagen na de
// vorige. Bij "Toepassen" rolt de hele keten vooraf uit als geplande
// crm_activities per lijst-lid, met cumulatieve dueAt.
//
// Edit-scope: alleen de lijst-eigenaar (leadLists.ownerUserId === actor) of een
// admin mag stappen muteren of toepassen. ownerUserId van een lijst kan null
// zijn (onDelete set null); in dat geval mag alleen een admin muteren.

import "server-only";
import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmCampaignSteps,
  type CrmCampaignStep,
} from "@/lib/db/schema/crmCampaignSteps";
import { crmOrgTasks, crmContacts, crmEvents } from "@/lib/db/schema/crmDeals";
import { leadListMembers } from "@/lib/db/schema/crm";
import { getLeadList } from "./leadList";
import { activityTypeLabel, type ActivityType } from "@/lib/config/crmActivity";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Staptype → crm_org_tasks.kind (bestaande taak-vocabulary in de UI).
const STEP_TASK_KIND: Record<ActivityType, string> = {
  call: "phone",
  email: "email",
  linkedin: "follow_up",
  meeting: "demo",
  note: "other",
};

// ───── Owner-scope ─────

/**
 * Laadt de lijst en bewaakt de edit-scope. Admin mag altijd. Anders moet de
 * actor de eigenaar zijn. Een lijst met null-owner mag alleen een admin muteren.
 * Gooit Error('not_found') als de lijst weg is, Error('forbidden') bij geen recht.
 */
async function assertCanEditList(
  listId: string,
  actorUserId: string,
  isAdmin: boolean,
) {
  const list = await getLeadList(listId);
  if (!list) throw new Error("not_found");
  if (isAdmin) return list;
  if (list.ownerUserId !== null && list.ownerUserId === actorUserId) return list;
  throw new Error("forbidden");
}

async function loadStep(id: string): Promise<CrmCampaignStep | null> {
  const [row] = await db
    .select()
    .from(crmCampaignSteps)
    .where(eq(crmCampaignSteps.id, id))
    .limit(1);
  return row ?? null;
}

// ───── Lezen ─────

/** Alle stappen van een lijst, op position oplopend. */
export async function listSteps(listId: string): Promise<CrmCampaignStep[]> {
  return await db
    .select()
    .from(crmCampaignSteps)
    .where(eq(crmCampaignSteps.listId, listId))
    .orderBy(asc(crmCampaignSteps.position));
}

// ───── Muteren ─────

/** Voeg een stap achteraan toe: position = max(position)+1, of 0 als leeg. */
export async function createStep(args: {
  listId: string;
  type: ActivityType;
  delayDays: number;
  required?: boolean;
  note?: string | null;
  actorUserId: string;
  isAdmin: boolean;
}): Promise<CrmCampaignStep> {
  await assertCanEditList(args.listId, args.actorUserId, args.isAdmin);

  const [agg] = await db
    .select({ maxPos: max(crmCampaignSteps.position) })
    .from(crmCampaignSteps)
    .where(eq(crmCampaignSteps.listId, args.listId));
  const nextPos = agg?.maxPos === null || agg?.maxPos === undefined
    ? 0
    : agg.maxPos + 1;

  const [row] = await db
    .insert(crmCampaignSteps)
    .values({
      listId: args.listId,
      position: nextPos,
      type: args.type,
      delayDays: args.delayDays,
      required: args.required ?? true,
      note: args.note ?? null,
    })
    .returning();
  return row;
}

/** Bewerk een stap (type/delay/required/note). Owner-scope via de lijst. */
export async function updateStep(args: {
  id: string;
  patch: {
    type?: ActivityType;
    delayDays?: number;
    required?: boolean;
    note?: string | null;
  };
  actorUserId: string;
  isAdmin: boolean;
}): Promise<CrmCampaignStep | null> {
  const step = await loadStep(args.id);
  if (!step) return null;
  await assertCanEditList(step.listId, args.actorUserId, args.isAdmin);

  const [row] = await db
    .update(crmCampaignSteps)
    .set({ ...args.patch, updatedAt: new Date() })
    .where(eq(crmCampaignSteps.id, args.id))
    .returning();
  return row ?? null;
}

/**
 * Verwijder een stap en hernummer de overige stappen van de lijst naar 0..n-1
 * zodat de volgorde compact blijft.
 */
export async function deleteStep(args: {
  id: string;
  actorUserId: string;
  isAdmin: boolean;
}): Promise<boolean> {
  const step = await loadStep(args.id);
  if (!step) return false;
  await assertCanEditList(step.listId, args.actorUserId, args.isAdmin);

  await db.delete(crmCampaignSteps).where(eq(crmCampaignSteps.id, args.id));

  const remaining = await db
    .select({ id: crmCampaignSteps.id })
    .from(crmCampaignSteps)
    .where(eq(crmCampaignSteps.listId, step.listId))
    .orderBy(asc(crmCampaignSteps.position));

  const now = new Date();
  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(crmCampaignSteps)
      .set({ position: i, updatedAt: now })
      .where(eq(crmCampaignSteps.id, remaining[i].id));
  }
  return true;
}

/**
 * Herorden de stappen van een lijst: zet position van elke id op de index in
 * orderedIds. Stappen die niet in orderedIds staan blijven onaangeroerd.
 */
export async function reorderSteps(args: {
  listId: string;
  orderedIds: string[];
  actorUserId: string;
  isAdmin: boolean;
}): Promise<void> {
  await assertCanEditList(args.listId, args.actorUserId, args.isAdmin);

  const now = new Date();
  for (let i = 0; i < args.orderedIds.length; i++) {
    await db
      .update(crmCampaignSteps)
      .set({ position: i, updatedAt: now })
      .where(
        and(
          eq(crmCampaignSteps.id, args.orderedIds[i]),
          eq(crmCampaignSteps.listId, args.listId),
        ),
      );
  }
}

// ───── Toepassen ─────

/**
 * Rol de cadence uit als crm_org_tasks (het bestaande taken-systeem). Per
 * lijst-lid en per stap één taak op de organisatie van dat lid, met cumulatieve
 * dueAt (som van delay_days t/m die stap, vanaf nu). Taken hangen aan een
 * organisatie: prospect-leden via hun crm_contact → org. Leden zonder
 * organisatie (losse klant-users) worden overgeslagen en geteld in skippedNoOrg.
 */
export async function applyCadenceToList(args: {
  listId: string;
  actorUserId: string;
  isAdmin: boolean;
}): Promise<{
  membersAffected: number;
  tasksCreated: number;
  skippedNoOrg: number;
}> {
  await assertCanEditList(args.listId, args.actorUserId, args.isAdmin);

  const steps = await listSteps(args.listId);
  const members = await db
    .select({
      userId: leadListMembers.userId,
      crmContactId: leadListMembers.crmContactId,
    })
    .from(leadListMembers)
    .where(eq(leadListMembers.listId, args.listId));

  if (steps.length === 0 || members.length === 0) {
    return { membersAffected: 0, tasksCreated: 0, skippedNoOrg: 0 };
  }

  // Prospect-leden → hun organisatie opzoeken (taken hangen aan een org).
  const contactIds = members
    .map((m) => m.crmContactId)
    .filter((v): v is string => v !== null);
  const orgByContact = new Map<string, string | null>();
  if (contactIds.length > 0) {
    const rows = await db
      .select({ id: crmContacts.id, orgId: crmContacts.crmOrganizationId })
      .from(crmContacts)
      .where(inArray(crmContacts.id, Array.from(new Set(contactIds))));
    for (const r of rows) orgByContact.set(r.id, r.orgId);
  }

  // dueAt = 09:00 op (vandaag + cumulatieve dagen). Voorkomt dat een dag-0 stap
  // exact op "nu" valt en meteen overdue toont.
  const dueAtAfter = (days: number): Date => {
    const d = new Date(Date.now() + days * MS_PER_DAY);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  // Cumulatieve dag-offset per stap.
  const cumulativeDays: number[] = [];
  let running = 0;
  for (const step of steps) {
    running += step.delayDays;
    cumulativeDays.push(running);
  }

  // Kandidaat-taken bouwen per lid-met-org.
  const candidates: (typeof crmOrgTasks.$inferInsert)[] = [];
  const orgIds = new Set<string>();
  let membersAffected = 0;
  let skippedNoOrg = 0;

  for (const member of members) {
    // Klant-users zonder org → overslaan (taken hangen aan een org).
    const orgId = member.crmContactId
      ? (orgByContact.get(member.crmContactId) ?? null)
      : null;
    if (!orgId) {
      skippedNoOrg++;
      continue;
    }
    membersAffected++;
    orgIds.add(orgId);
    steps.forEach((step, i) => {
      const type = step.type as ActivityType;
      candidates.push({
        crmOrganizationId: orgId,
        title: step.note?.trim() || activityTypeLabel(type),
        kind: STEP_TASK_KIND[type] ?? "other",
        dueAt: dueAtAfter(cumulativeDays[i]),
        notes: step.note ?? null,
        createdByUserId: args.actorUserId,
      });
    });
  }

  if (candidates.length === 0) {
    return { membersAffected: 0, tasksCreated: 0, skippedNoOrg };
  }

  // Idempotentie: bestaande open taken (niet voltooid, niet verwijderd) voor deze
  // orgs ophalen en (org|titel|kind)-duplicaten overslaan, zodat 2x "Toepassen"
  // geen dubbele taken aanmaakt.
  const existing = await db
    .select({
      orgId: crmOrgTasks.crmOrganizationId,
      title: crmOrgTasks.title,
      kind: crmOrgTasks.kind,
    })
    .from(crmOrgTasks)
    .where(
      and(
        inArray(crmOrgTasks.crmOrganizationId, Array.from(orgIds)),
        isNull(crmOrgTasks.completedAt),
        isNull(crmOrgTasks.deletedAt),
      ),
    );
  const seen = new Set(existing.map((t) => `${t.orgId}|${t.title}|${t.kind}`));
  const values = candidates.filter((v) => {
    const key = `${v.crmOrganizationId}|${v.title}|${v.kind}`;
    if (seen.has(key)) return false;
    seen.add(key); // ook binnen deze batch dedupen
    return true;
  });

  if (values.length === 0) {
    return { membersAffected, tasksCreated: 0, skippedNoOrg };
  }

  const inserted = await db
    .insert(crmOrgTasks)
    .values(values)
    .returning({ id: crmOrgTasks.id });

  // task_added-events zodat cadence-taken net als handmatige taken in de Timeline
  // van de org verschijnen (consistent met addCrmOrgTask).
  await db.insert(crmEvents).values(
    values.map((v) => ({
      crmOrganizationId: v.crmOrganizationId as string,
      actorUserId: args.actorUserId,
      kind: "task_added" as const,
      payload: { title: v.title, kind: v.kind, dueAt: v.dueAt, source: "cadence" },
    })),
  );

  return { membersAffected, tasksCreated: inserted.length, skippedNoOrg };
}
