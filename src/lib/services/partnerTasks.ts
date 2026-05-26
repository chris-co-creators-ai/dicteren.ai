// Dicteren.ai — Partner-tasks service.
// CRM-workflow: bel/mail/demo/bezoek-taken per partner. Open-tasks worden
// op het /admin dashboard getoond (boven recente activiteit).

import "server-only";
import { and, asc, desc, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  partnerTasks,
  partnerOrganizations,
  type PartnerTask,
} from "@/lib/db/schema";
import { logEvent } from "./audit";

export type PartnerTaskKind =
  | "email"
  | "phone"
  | "demo"
  | "visit"
  | "follow_up"
  | "other";

export type CreateTaskArgs = {
  partnerOrgId: string;
  title: string;
  kind?: PartnerTaskKind;
  dueDate?: Date | null;
  notes?: string | null;
  createdByUserId: string;
};

export async function createPartnerTask(args: CreateTaskArgs) {
  const [row] = await db
    .insert(partnerTasks)
    .values({
      partnerOrgId: args.partnerOrgId,
      title: args.title.trim(),
      kind: args.kind ?? "other",
      dueDate: args.dueDate ?? null,
      notes: args.notes ?? null,
      createdByUserId: args.createdByUserId,
    })
    .returning();

  await logEvent({
    action: "partner.task_created",
    entityType: "partner_task",
    entityId: row.id,
    actorId: args.createdByUserId,
    metadata: {
      partnerOrgId: args.partnerOrgId,
      title: args.title,
      kind: args.kind ?? "other",
      dueDate: args.dueDate?.toISOString() ?? null,
    },
  });

  return row;
}

export async function listTasksByPartner(
  partnerOrgId: string,
): Promise<PartnerTask[]> {
  return db
    .select()
    .from(partnerTasks)
    .where(eq(partnerTasks.partnerOrgId, partnerOrgId))
    .orderBy(asc(partnerTasks.status), asc(partnerTasks.dueDate));
}

export type OpenTaskWithOrg = PartnerTask & {
  organizationName: string;
  externalId: string;
  accountOwner: string | null;
};

/** Alle openstaande taken met partner-info — voor dashboard. Sortering:
 *  overdue eerst (oudste dueDate bovenaan), dan komende dueDates, dan
 *  zonder dueDate. */
export async function listOpenPartnerTasks(
  limit = 50,
): Promise<OpenTaskWithOrg[]> {
  const rows = await db
    .select({
      task: partnerTasks,
      organizationName: partnerOrganizations.organizationName,
      externalId: partnerOrganizations.externalId,
      accountOwner: partnerOrganizations.accountOwner,
    })
    .from(partnerTasks)
    .innerJoin(
      partnerOrganizations,
      eq(partnerOrganizations.id, partnerTasks.partnerOrgId),
    )
    .where(eq(partnerTasks.status, "open"))
    .orderBy(asc(partnerTasks.dueDate))
    .limit(limit);

  return rows.map((r) => ({
    ...r.task,
    organizationName: r.organizationName,
    externalId: r.externalId,
    accountOwner: r.accountOwner,
  }));
}

export async function countOverdueOpenTasks(): Promise<number> {
  const rows = await db
    .select({ id: partnerTasks.id })
    .from(partnerTasks)
    .where(
      and(
        eq(partnerTasks.status, "open"),
        isNotNull(partnerTasks.dueDate),
        lt(partnerTasks.dueDate, new Date()),
      ),
    );
  return rows.length;
}

export async function markPartnerTaskDone(
  taskId: string,
  actorId: string,
): Promise<PartnerTask | null> {
  const [row] = await db
    .update(partnerTasks)
    .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(partnerTasks.id, taskId))
    .returning();
  if (row) {
    await logEvent({
      action: "partner.task_done",
      entityType: "partner_task",
      entityId: row.id,
      actorId,
      metadata: { partnerOrgId: row.partnerOrgId },
    });
  }
  return row ?? null;
}

export async function reopenPartnerTask(
  taskId: string,
  actorId: string,
): Promise<PartnerTask | null> {
  const [row] = await db
    .update(partnerTasks)
    .set({ status: "open", completedAt: null, updatedAt: new Date() })
    .where(eq(partnerTasks.id, taskId))
    .returning();
  if (row) {
    await logEvent({
      action: "partner.task_reopened",
      entityType: "partner_task",
      entityId: row.id,
      actorId,
      metadata: { partnerOrgId: row.partnerOrgId },
    });
  }
  return row ?? null;
}

export async function deletePartnerTask(
  taskId: string,
  actorId: string,
): Promise<boolean> {
  const [row] = await db
    .delete(partnerTasks)
    .where(eq(partnerTasks.id, taskId))
    .returning({ id: partnerTasks.id, partnerOrgId: partnerTasks.partnerOrgId });
  if (row) {
    await logEvent({
      action: "partner.task_deleted",
      entityType: "partner_task",
      entityId: row.id,
      actorId,
      metadata: { partnerOrgId: row.partnerOrgId },
    });
    return true;
  }
  return false;
}

export async function recentDoneTasks(limit = 10) {
  return db
    .select()
    .from(partnerTasks)
    .where(eq(partnerTasks.status, "done"))
    .orderBy(desc(partnerTasks.completedAt))
    .limit(limit);
}
