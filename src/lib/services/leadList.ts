// Dicteren.ai — Lead-list CRUD + member management.

import "server-only";
import { and, eq, inArray, or, desc, sql } from "drizzle-orm";
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
export async function listLeadLists(args: {
  userId: string;
}): Promise<LeadListWithCount[]> {
  const rows = await db
    .select({
      id: leadLists.id,
      name: leadLists.name,
      description: leadLists.description,
      color: leadLists.color,
      ownerUserId: leadLists.ownerUserId,
      isShared: leadLists.isShared,
      createdAt: leadLists.createdAt,
      updatedAt: leadLists.updatedAt,
      memberCount: sql<number>`(SELECT COUNT(*)::int FROM ${leadListMembers} WHERE ${leadListMembers.listId} = ${leadLists.id})`,
    })
    .from(leadLists)
    .where(
      or(eq(leadLists.isShared, true), eq(leadLists.ownerUserId, args.userId)),
    )
    .orderBy(desc(leadLists.updatedAt));
  return rows;
}

export async function createLeadList(args: {
  name: string;
  description?: string | null;
  color?: ListColorValue;
  ownerUserId: string;
  isShared?: boolean;
}): Promise<LeadList> {
  const [row] = await db
    .insert(leadLists)
    .values({
      name: args.name.trim(),
      description: args.description ?? null,
      color: args.color ?? "blue",
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

/** Bulk add: idempotent op (listId, userId). */
export async function addMembersToList(args: {
  listId: string;
  userIds: string[];
  addedByUserId: string;
}): Promise<number> {
  if (args.userIds.length === 0) return 0;
  const values = args.userIds.map((userId) => ({
    listId: args.listId,
    userId,
    addedByUserId: args.addedByUserId,
  }));
  const inserted = await db
    .insert(leadListMembers)
    .values(values)
    .onConflictDoNothing()
    .returning({ userId: leadListMembers.userId });
  return inserted.length;
}

export async function removeMembersFromList(args: {
  listId: string;
  userIds: string[];
}): Promise<void> {
  if (args.userIds.length === 0) return;
  await db
    .delete(leadListMembers)
    .where(
      and(
        eq(leadListMembers.listId, args.listId),
        inArray(leadListMembers.userId, args.userIds),
      ),
    );
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
    .where(inArray(leadListMembers.listId, args.visibleListIds));
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const prev = map.get(r.userId);
    if (prev) prev.push(r.listId);
    else map.set(r.userId, [r.listId]);
  }
  return map;
}

/** Lijst van userIds in een specifieke lijst — voor list-tab filtering. */
export async function userIdsInList(listId: string): Promise<Set<string>> {
  const rows = await db
    .select({ userId: leadListMembers.userId })
    .from(leadListMembers)
    .where(eq(leadListMembers.listId, listId));
  return new Set(rows.map((r) => r.userId));
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
