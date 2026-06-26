// Dicteren.ai — Lead-list CRUD + member management.

import "server-only";
import { and, eq, inArray, or, isNotNull, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  leadLists,
  leadListMembers,
  authUsers,
  type LeadList,
} from "@/lib/db/schema";

export type ListColorValue =
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "gray"
  | "navy"
  | "aqua";

export type LeadListWithCount = LeadList & {
  memberCount: number;
};

/** Alle lijsten zichtbaar voor deze admin (eigen + gedeelde). */
export async function listLeadLists(_args: {
  userId: string;
}): Promise<LeadListWithCount[]> {
  // Iedereen ziet alle leadlijsten (geen owner/shared-filter meer). De
  // userId-arg blijft staan voor de call-sites maar wordt niet meer gefilterd.
  const rows = await db
    .select({
      id: leadLists.id,
      name: leadLists.name,
      description: leadLists.description,
      color: leadLists.color,
      listType: leadLists.listType,
      ownerUserId: leadLists.ownerUserId,
      isShared: leadLists.isShared,
      createdAt: leadLists.createdAt,
      updatedAt: leadLists.updatedAt,
      memberCount: sql<number>`(SELECT COUNT(*)::int FROM ${leadListMembers} WHERE ${leadListMembers.listId} = ${leadLists.id})`,
    })
    .from(leadLists)
    .orderBy(desc(leadLists.updatedAt));
  return rows;
}

export async function createLeadList(args: {
  name: string;
  description?: string | null;
  color?: ListColorValue;
  listType?: "eindklant" | "reseller";
  ownerUserId: string;
  isShared?: boolean;
}): Promise<LeadList> {
  const [row] = await db
    .insert(leadLists)
    .values({
      name: args.name.trim(),
      description: args.description ?? null,
      color: args.color ?? "blue",
      listType: args.listType ?? "eindklant",
      ownerUserId: args.ownerUserId,
      isShared: args.isShared ?? true,
    })
    .returning();
  return row;
}

export async function updateLeadList(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    color: ListColorValue;
    isShared: boolean;
  }>,
): Promise<LeadList | null> {
  const [row] = await db
    .update(leadLists)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(leadLists.id, id))
    .returning();
  return row ?? null;
}

export async function deleteLeadList(id: string): Promise<void> {
  await db.delete(leadLists).where(eq(leadLists.id, id));
}

export async function getLeadList(id: string): Promise<LeadList | null> {
  const [row] = await db
    .select()
    .from(leadLists)
    .where(eq(leadLists.id, id))
    .limit(1);
  return row ?? null;
}

/** Bulk add: idempotent per type. Een member is óf een auth.user (klant)
 *  óf een crm_contact (prospect). Beide kunnen in één call mee. */
export async function addMembersToList(args: {
  listId: string;
  userIds?: string[];
  crmContactIds?: string[];
  addedByUserId: string;
}): Promise<number> {
  const userValues = (args.userIds ?? []).map((userId) => ({
    listId: args.listId,
    userId,
    addedByUserId: args.addedByUserId,
  }));
  const contactValues = (args.crmContactIds ?? []).map((crmContactId) => ({
    listId: args.listId,
    crmContactId,
    addedByUserId: args.addedByUserId,
  }));
  const values = [...userValues, ...contactValues];
  if (values.length === 0) return 0;
  const inserted = await db
    .insert(leadListMembers)
    .values(values)
    .onConflictDoNothing()
    .returning({ listId: leadListMembers.listId });
  return inserted.length;
}

export async function removeMembersFromList(args: {
  listId: string;
  userIds?: string[];
  crmContactIds?: string[];
}): Promise<void> {
  const userIds = args.userIds ?? [];
  const contactIds = args.crmContactIds ?? [];
  if (userIds.length === 0 && contactIds.length === 0) return;
  const memberMatch = or(
    userIds.length > 0 ? inArray(leadListMembers.userId, userIds) : undefined,
    contactIds.length > 0
      ? inArray(leadListMembers.crmContactId, contactIds)
      : undefined,
  );
  await db
    .delete(leadListMembers)
    .where(and(eq(leadListMembers.listId, args.listId), memberMatch));
}

/** Map { userId → listIds[] } voor alle members van de zichtbare lijsten. */
export async function membershipsByUser(args: {
  visibleListIds: string[];
}): Promise<Map<string, string[]>> {
  if (args.visibleListIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: leadListMembers.userId,
      listId: leadListMembers.listId,
    })
    .from(leadListMembers)
    .where(
      and(
        inArray(leadListMembers.listId, args.visibleListIds),
        isNotNull(leadListMembers.userId),
      ),
    );
  const map = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.userId) continue;
    const prev = map.get(r.userId);
    if (prev) prev.push(r.listId);
    else map.set(r.userId, [r.listId]);
  }
  return map;
}

/** Map { crmContactId → listIds[] } voor alle prospect-members van de
 *  zichtbare lijsten. Spiegelt membershipsByUser voor de contact-tak. */
export async function membershipsByContact(args: {
  visibleListIds: string[];
}): Promise<Map<string, string[]>> {
  if (args.visibleListIds.length === 0) return new Map();
  const rows = await db
    .select({
      crmContactId: leadListMembers.crmContactId,
      listId: leadListMembers.listId,
    })
    .from(leadListMembers)
    .where(
      and(
        inArray(leadListMembers.listId, args.visibleListIds),
        isNotNull(leadListMembers.crmContactId),
      ),
    );
  const map = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.crmContactId) continue;
    const prev = map.get(r.crmContactId);
    if (prev) prev.push(r.listId);
    else map.set(r.crmContactId, [r.listId]);
  }
  return map;
}

/** Lijst van userIds in een specifieke lijst — voor list-tab filtering. */
export async function userIdsInList(listId: string): Promise<Set<string>> {
  const rows = await db
    .select({ userId: leadListMembers.userId })
    .from(leadListMembers)
    .where(
      and(
        eq(leadListMembers.listId, listId),
        isNotNull(leadListMembers.userId),
      ),
    );
  return new Set(rows.flatMap((r) => (r.userId ? [r.userId] : [])));
}

/** Staff-team voor "assigned to" dropdown — admin + account_manager. */
export async function listAdminUsers() {
  return await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
    })
    .from(authUsers)
    .where(inArray(authUsers.role, ["admin", "account_manager"]));
}
