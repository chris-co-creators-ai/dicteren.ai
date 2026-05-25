// Dicteren.ai — Inkomende contact/partnership berichten.

import "server-only";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contactMessages,
  type ContactMessage,
  type NewContactMessage,
} from "@/lib/db/schema";

export type ContactMessageKind =
  | "general"
  | "sales"
  | "support"
  | "partnership"
  | "quote_request";

export type ContactMessageStatus =
  | "new"
  | "in_progress"
  | "closed"
  | "spam";

/** Server-side: sla een binnenkomend bericht op. */
export async function createContactMessage(args: {
  kind: ContactMessageKind;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  subject?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  ipHash?: string | null;
  userAgent?: string | null;
  linkedAffiliateId?: string | null;
  linkedUserId?: string | null;
}): Promise<ContactMessage> {
  const values: NewContactMessage = {
    kind: args.kind,
    name: args.name.trim(),
    email: args.email.trim().toLowerCase(),
    company: args.company ?? null,
    phone: args.phone ?? null,
    subject: args.subject ?? null,
    message: args.message.trim(),
    metadata: args.metadata ?? null,
    ipHash: args.ipHash ?? null,
    userAgent: args.userAgent ?? null,
    linkedAffiliateId: args.linkedAffiliateId ?? null,
    linkedUserId: args.linkedUserId ?? null,
    status: "new",
  };
  const [row] = await db
    .insert(contactMessages)
    .values(values)
    .returning();
  return row;
}

/** Lijst voor /admin/messages. */
export async function listContactMessages(args: {
  kind?: ContactMessageKind | "all";
  status?: ContactMessageStatus | "all";
  search?: string;
}): Promise<ContactMessage[]> {
  const conditions = [];
  if (args.kind && args.kind !== "all") {
    conditions.push(eq(contactMessages.kind, args.kind));
  }
  if (args.status && args.status !== "all") {
    conditions.push(eq(contactMessages.status, args.status));
  }
  if (args.search) {
    const q = `%${args.search.toLowerCase()}%`;
    conditions.push(
      or(
        like(contactMessages.email, q),
        like(contactMessages.name, q),
        like(contactMessages.company, q),
        like(contactMessages.subject, q),
      ),
    );
  }
  return await db
    .select()
    .from(contactMessages)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contactMessages.createdAt))
    .limit(500);
}

export async function getContactMessage(
  id: string,
): Promise<ContactMessage | null> {
  const [row] = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateContactMessage(
  id: string,
  patch: Partial<{
    status: ContactMessageStatus;
    assignedToUserId: string | null;
    adminNotes: string | null;
  }>,
): Promise<ContactMessage | null> {
  const [row] = await db
    .update(contactMessages)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(contactMessages.id, id))
    .returning();
  return row ?? null;
}

/** KPI's voor /admin/messages dashboard. */
export async function contactMessageKpis(): Promise<{
  total: number;
  newCount: number;
  partnershipCount: number;
}> {
  const rows = await db
    .select({
      status: contactMessages.status,
      kind: contactMessages.kind,
    })
    .from(contactMessages);
  return {
    total: rows.length,
    newCount: rows.filter((r) => r.status === "new").length,
    partnershipCount: rows.filter((r) => r.kind === "partnership").length,
  };
}
