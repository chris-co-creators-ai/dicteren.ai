// Dicteren.ai — Custom CRM-kolommen.
// Waardes worden in customer_attributes.custom_fields opgeslagen als
// { [key]: value }. Keys hebben prefix "custom:" om collision met built-in
// kolommen te voorkomen.

import "server-only";
import { asc, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  crmCustomColumns,
  type CrmCustomColumn,
} from "@/lib/db/schema";

export type CustomColumnType = "text" | "number" | "date" | "select";

export type CustomColumnDef = {
  id: string;
  key: string;
  name: string;
  type: CustomColumnType;
  options: string[] | null;
  position: number;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function listCustomColumns(): Promise<CustomColumnDef[]> {
  const rows = await db
    .select({
      id: crmCustomColumns.id,
      key: crmCustomColumns.key,
      name: crmCustomColumns.name,
      type: crmCustomColumns.type,
      options: crmCustomColumns.options,
      position: crmCustomColumns.position,
    })
    .from(crmCustomColumns)
    .orderBy(asc(crmCustomColumns.position), asc(crmCustomColumns.name));
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    type: r.type as CustomColumnType,
    options: Array.isArray(r.options) ? (r.options as string[]) : null,
    position: r.position,
  }));
}

export async function createCustomColumn(args: {
  name: string;
  type: CustomColumnType;
  options?: string[] | null;
  ownerUserId: string;
}): Promise<CrmCustomColumn> {
  const slug = slugify(args.name) || `col_${randomBytes(3).toString("hex")}`;
  let key = `custom:${slug}`;
  // Defensive: ensure uniqueness.
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select({ id: crmCustomColumns.id })
      .from(crmCustomColumns)
      .where(eq(crmCustomColumns.key, key))
      .limit(1);
    if (!existing) break;
    key = `custom:${slug}_${randomBytes(2).toString("hex")}`;
  }
  const [row] = await db
    .insert(crmCustomColumns)
    .values({
      key,
      name: args.name,
      type: args.type,
      options: args.options ?? null,
      ownerUserId: args.ownerUserId,
      isShared: true,
      position: Date.now() % 1_000_000,
    })
    .returning();
  return row;
}

export async function updateCustomColumn(
  id: string,
  patch: Partial<{
    name: string;
    options: string[] | null;
    position: number;
  }>,
): Promise<CrmCustomColumn | null> {
  const [row] = await db
    .update(crmCustomColumns)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(crmCustomColumns.id, id))
    .returning();
  return row ?? null;
}

export async function deleteCustomColumn(id: string): Promise<void> {
  await db.delete(crmCustomColumns).where(eq(crmCustomColumns.id, id));
}
