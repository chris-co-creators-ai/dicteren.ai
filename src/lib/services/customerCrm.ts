// Dicteren.ai — CRM customer-attributes (stage / temperature / assignee / notes).

import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  customerAttributes,
  type CustomerAttributes,
} from "@/lib/db/schema";

export type CustomerStageValue =
  | "lead"
  | "prospect"
  | "mql"
  | "sql"
  | "customer"
  | "lost"
  | "churned";

export type CustomerTemperatureValue =
  | "cold"
  | "lukewarm"
  | "warm"
  | "hot";

export type CustomerAttrPatch = Partial<{
  stage: CustomerStageValue | null;
  temperature: CustomerTemperatureValue | null;
  assignedToUserId: string | null;
  notes: string | null;
  lastActivityAt: Date | null;
}>;

/** Upsert van customer-attributes. Idempotent. */
export async function setCustomerAttributes(
  userId: string,
  patch: CustomerAttrPatch,
): Promise<CustomerAttributes> {
  const [row] = await db
    .insert(customerAttributes)
    .values({
      userId,
      ...patch,
    })
    .onConflictDoUpdate({
      target: customerAttributes.userId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  return row;
}

/** Bulk-update voor selectie van customers. Heel makkelijk: één SQL UPDATE
 *  via INSERT...ON CONFLICT zou ideaal zijn, maar drizzle's onConflictDoUpdate
 *  laat dynamische SET niet toe. Doe simpel: upsert per user. */
export async function bulkSetCustomerAttributes(args: {
  userIds: string[];
  patch: CustomerAttrPatch;
}): Promise<number> {
  if (args.userIds.length === 0) return 0;
  // Insert eerst de rijen die nog niet bestaan (idempotent via PK).
  await db
    .insert(customerAttributes)
    .values(args.userIds.map((userId) => ({ userId, ...args.patch })))
    .onConflictDoNothing({ target: customerAttributes.userId });

  // Daarna één UPDATE voor de bestaande rijen.
  await db
    .update(customerAttributes)
    .set({ ...args.patch, updatedAt: new Date() })
    .where(inArray(customerAttributes.userId, args.userIds));

  return args.userIds.length;
}

/** Map { userId → attributes } voor batch-rendering in CRM. */
export async function attributesByUser(
  userIds: string[],
): Promise<Map<string, CustomerAttributes>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(customerAttributes)
    .where(inArray(customerAttributes.userId, userIds));
  const map = new Map<string, CustomerAttributes>();
  for (const r of rows) map.set(r.userId, r);
  return map;
}

/** Default-stage afleiding als er nog geen customer_attributes-rij is.
 *  Logica: heeft paid license → "customer", heeft active trial → "lead",
 *  expired trial → "lead", anders "lead". Pipeline-eigenaar mag handmatig
 *  overschrijven. */
export function defaultStageFor(
  paidLicenseCount: number,
  trialStatus: string | null,
): CustomerStageValue {
  if (paidLicenseCount > 0) return "customer";
  if (trialStatus === "active") return "lead";
  return "lead";
}

/** Default-temperature: trial-active = warm, trial-expired = cold, anders cold. */
export function defaultTemperatureFor(
  trialStatus: string | null,
  paidLicenseCount: number,
): CustomerTemperatureValue {
  if (paidLicenseCount > 0) return "hot";
  if (trialStatus === "active") return "warm";
  return "cold";
}
