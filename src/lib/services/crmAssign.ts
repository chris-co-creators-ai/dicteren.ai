import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmContacts, leadListMembers, leadLists } from "@/lib/db/schema";
import { logEvent } from "@/lib/services/audit";

// Dicteren.ai — Toewijzing van prospects/lijsten aan een AM.
//
// Admin (data-engineer) wijst rows of een hele lead-lijst toe aan een AM. Een
// toegewezen prospect verlaat de admin-pool (assigned IS NULL) en verschijnt in
// de CRM van die AM. null = terug naar de pool.

/** Wijs een set prospects (crm_contacts) toe aan een AM (of null = pool). */
export async function assignContacts(args: {
  contactIds: string[];
  assignToUserId: string | null;
  actorUserId: string;
}): Promise<{ assigned: number }> {
  if (args.contactIds.length === 0) return { assigned: 0 };

  const updated = await db
    .update(crmContacts)
    .set({ assignedToUserId: args.assignToUserId, updatedAt: new Date() })
    .where(inArray(crmContacts.id, args.contactIds))
    .returning({ id: crmContacts.id });

  await logEvent({
    action: "admin.action",
    entityType: "crm_contact",
    entityId: args.contactIds[0],
    actorId: args.actorUserId,
    metadata: {
      action: "assign_prospects",
      assignedTo: args.assignToUserId,
      count: updated.length,
    },
  });

  return { assigned: updated.length };
}

/** Wijs alle prospect-members van een lead-lijst toe aan een AM + zet de
 *  lijst-eigenaar. De lijst "behoort" daarmee tot die AM. */
export async function assignLeadList(args: {
  listId: string;
  assignToUserId: string | null;
  actorUserId: string;
}): Promise<{ assigned: number }> {
  const memberRows = await db
    .select({ crmContactId: leadListMembers.crmContactId })
    .from(leadListMembers)
    .where(
      and(
        eq(leadListMembers.listId, args.listId),
        isNotNull(leadListMembers.crmContactId),
      ),
    );
  const contactIds = memberRows
    .map((m) => m.crmContactId)
    .filter((id): id is string => id !== null);

  let assigned = 0;
  if (contactIds.length > 0) {
    const updated = await db
      .update(crmContacts)
      .set({ assignedToUserId: args.assignToUserId, updatedAt: new Date() })
      .where(inArray(crmContacts.id, contactIds))
      .returning({ id: crmContacts.id });
    assigned = updated.length;
  }

  // Lijst-eigenaarschap volgt de toewijzing.
  await db
    .update(leadLists)
    .set({ ownerUserId: args.assignToUserId, updatedAt: new Date() })
    .where(eq(leadLists.id, args.listId));

  await logEvent({
    action: "admin.action",
    entityType: "lead_list",
    entityId: args.listId,
    actorId: args.actorUserId,
    metadata: {
      action: "assign_lead_list",
      assignedTo: args.assignToUserId,
      count: assigned,
    },
  });

  return { assigned };
}
