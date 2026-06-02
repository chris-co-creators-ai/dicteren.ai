// Dicteren.ai — Per-admin CRM column-prefs (visibility + order).
// Server-only DB-access. Types staan in columnPrefsShared.ts.

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmColumnPrefs } from "@/lib/db/schema";
import {
  DEFAULT_VISIBLE_COLUMNS,
  type ColumnKey,
  type ColumnPrefs,
} from "./columnPrefsShared";

export type { ColumnKey, ColumnPrefs } from "./columnPrefsShared";
export {
  DEFAULT_VISIBLE_COLUMNS,
  COLUMN_LABELS,
} from "./columnPrefsShared";

/** Lees prefs voor admin. Fallback = alle kolommen zichtbaar, default order. */
export async function getColumnPrefs(userId: string): Promise<ColumnPrefs> {
  const [row] = await db
    .select()
    .from(crmColumnPrefs)
    .where(eq(crmColumnPrefs.userId, userId))
    .limit(1);
  if (!row) {
    return {
      visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
      columnOrder: [...DEFAULT_VISIBLE_COLUMNS],
      columnWidths: {},
    };
  }
  const visible = (row.visibleColumns as ColumnKey[]) ?? [];
  const order = (row.columnOrder as ColumnKey[]) ?? [];
  return {
    visibleColumns:
      visible.length > 0 ? visible : [...DEFAULT_VISIBLE_COLUMNS],
    columnOrder: order.length > 0 ? order : [...DEFAULT_VISIBLE_COLUMNS],
    columnWidths: (row.columnWidths as Record<string, number>) ?? {},
  };
}

export async function setColumnPrefs(
  userId: string,
  prefs: ColumnPrefs,
): Promise<void> {
  await db
    .insert(crmColumnPrefs)
    .values({
      userId,
      visibleColumns: prefs.visibleColumns,
      columnOrder: prefs.columnOrder,
      columnWidths: prefs.columnWidths ?? {},
    })
    .onConflictDoUpdate({
      target: crmColumnPrefs.userId,
      set: {
        visibleColumns: prefs.visibleColumns,
        columnOrder: prefs.columnOrder,
        columnWidths: prefs.columnWidths ?? {},
        updatedAt: new Date(),
      },
    });
}
