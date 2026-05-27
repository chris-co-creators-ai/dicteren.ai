// Dicteren.ai — Per-user action-permission service (Laag B in AM-team PRD)
//
// Voor account_manager: leest uit staff_action_permissions. Fallback naar
// AM_DEFAULT_PERMISSIONS als er geen rij is.
// Voor admin: returnt automatisch alle keys op true.

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  ACTION_KEYS,
  AM_DEFAULT_PERMISSIONS,
  staffActionPermissions,
  type ActionKey,
  type ActionPermissions,
} from "@/lib/db/schema/staffActionPermissions";
import { logEvent } from "./audit";

export async function getPermissionsFor(args: {
  userId: string;
  role: string | null;
}): Promise<ActionPermissions> {
  if (args.role === "admin") {
    // Admin krijgt alle keys op true zonder DB-rij
    const all: ActionPermissions = {};
    for (const k of ACTION_KEYS) all[k] = true;
    return all;
  }
  const [row] = await db
    .select({ permissions: staffActionPermissions.permissions })
    .from(staffActionPermissions)
    .where(eq(staffActionPermissions.userId, args.userId))
    .limit(1);
  if (!row) return AM_DEFAULT_PERMISSIONS;
  return row.permissions as ActionPermissions;
}

export async function canPerform(args: {
  userId: string;
  role: string | null;
  action: ActionKey;
}): Promise<boolean> {
  const perms = await getPermissionsFor({
    userId: args.userId,
    role: args.role,
  });
  return perms[args.action] === true;
}

export async function updatePermissionsFor(args: {
  userId: string;
  patch: ActionPermissions;
  actorUserId: string;
}): Promise<ActionPermissions> {
  const current = await getPermissionsFor({
    userId: args.userId,
    role: "account_manager",
  });
  const merged: ActionPermissions = { ...current, ...args.patch };

  await db
    .insert(staffActionPermissions)
    .values({
      userId: args.userId,
      permissions: merged,
      updatedBy: args.actorUserId,
    })
    .onConflictDoUpdate({
      target: staffActionPermissions.userId,
      set: {
        permissions: merged,
        updatedBy: args.actorUserId,
        updatedAt: new Date(),
      },
    });

  await logEvent({
    action: "admin.action",
    entityType: "staff_action_permissions",
    entityId: args.userId,
    actorId: args.actorUserId,
    metadata: { patch: args.patch },
  });

  return merged;
}

export { ACTION_KEYS, AM_DEFAULT_PERMISSIONS };
export type { ActionKey, ActionPermissions };
