// Dicteren.ai — Per-user page-blocks bovenop role-defaults.
//
// Admin kan via /admin/settings/staff individuele account-managers (of
// elke staff-user) bepaalde admin-pages ontnemen. Default = niets
// geblokkeerd = volle role-toegang.

import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { staffPageBlocks } from "@/lib/db/schema";

export type StaffBlockInfo = {
  userId: string;
  blockedPaths: string[];
  notes: string | null;
  updatedAt: Date;
  updatedByUserId: string | null;
};

export async function getBlockedPathsForUser(
  userId: string,
): Promise<string[]> {
  const [row] = await db
    .select({ blockedPaths: staffPageBlocks.blockedPaths })
    .from(staffPageBlocks)
    .where(eq(staffPageBlocks.userId, userId))
    .limit(1);
  return Array.isArray(row?.blockedPaths)
    ? (row!.blockedPaths as string[])
    : [];
}

export async function getStaffBlock(
  userId: string,
): Promise<StaffBlockInfo | null> {
  const [row] = await db
    .select()
    .from(staffPageBlocks)
    .where(eq(staffPageBlocks.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    userId: row.userId,
    blockedPaths: Array.isArray(row.blockedPaths)
      ? (row.blockedPaths as string[])
      : [],
    notes: row.notes,
    updatedAt: row.updatedAt,
    updatedByUserId: row.updatedByUserId,
  };
}

/** Upsert van blocked-paths voor één user. Lege array = volledige toegang. */
export async function setStaffBlocks(args: {
  userId: string;
  blockedPaths: string[];
  notes?: string | null;
  updatedByUserId: string;
}): Promise<void> {
  await db
    .insert(staffPageBlocks)
    .values({
      userId: args.userId,
      blockedPaths: args.blockedPaths,
      notes: args.notes ?? null,
      updatedByUserId: args.updatedByUserId,
    })
    .onConflictDoUpdate({
      target: staffPageBlocks.userId,
      set: {
        blockedPaths: args.blockedPaths,
        notes: args.notes ?? null,
        updatedByUserId: args.updatedByUserId,
        updatedAt: new Date(),
      },
    });
}

/** Map { userId → blockedPaths[] } voor batch-rendering in settings-page. */
export async function listStaffBlocks(): Promise<Map<string, string[]>> {
  const rows = await db
    .select({
      userId: staffPageBlocks.userId,
      blockedPaths: staffPageBlocks.blockedPaths,
    })
    .from(staffPageBlocks);
  const map = new Map<string, string[]>();
  for (const r of rows) {
    map.set(
      r.userId,
      Array.isArray(r.blockedPaths) ? (r.blockedPaths as string[]) : [],
    );
  }
  return map;
}

/** Check of een path geblokkeerd is voor deze user. */
export async function isPathBlocked(
  userId: string,
  path: string,
): Promise<boolean> {
  const blocked = await getBlockedPathsForUser(userId);
  return blocked.includes(path);
}

/** Page-keys die toe te wijzen zijn als blocks (== alle /admin/* routes). */
export const STAFF_BLOCKABLE_PATHS: Array<{
  path: string;
  label: string;
  defaultManagerAccess: boolean;
}> = [
  { path: "/admin", label: "Overzicht", defaultManagerAccess: true },
  { path: "/admin/analytics", label: "Analytics", defaultManagerAccess: true },
  { path: "/admin/crm", label: "CRM", defaultManagerAccess: true },
  { path: "/admin/messages", label: "Berichten", defaultManagerAccess: true },
  { path: "/admin/pricing", label: "Prijzen & marge", defaultManagerAccess: true },
  { path: "/admin/discounts", label: "Kortingen", defaultManagerAccess: true },
  { path: "/admin/affiliates", label: "Affiliates", defaultManagerAccess: true },
  { path: "/admin/partners", label: "Partners", defaultManagerAccess: true },
];
