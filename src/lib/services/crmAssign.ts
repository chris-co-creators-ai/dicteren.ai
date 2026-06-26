import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmContacts,
  crmOrganizations,
  leadListMembers,
  leadLists,
} from "@/lib/db/schema";
import { logEvent } from "@/lib/services/audit";

// Dicteren.ai — Toewijzing van prospects/lijsten aan een AM.
//
// Admin (data-engineer) wijst rows of een hele lead-lijst toe aan een AM. Een
// toegewezen prospect verlaat de admin-pool (assigned IS NULL) en verschijnt in
// de CRM van die AM. null = terug naar de pool.

/** Wijs een set prospects (crm_contacts) toe aan een AM (of null = pool).
 *
 *  ownerScopeUserId: voor een account_manager → alleen contacten waarvan de
 *  gekoppelde org van die AM is (een AM draagt alleen z'n eigen leads over).
 *  null = admin, geen filter.
 *
 *  Bij overdracht verschuift óók de org-eigenaar (account_owner_id) mee, anders
 *  blijft de prospect in de personen-scope van de oude AM hangen (die leest
 *  org.account_owner_id). */
export async function assignContacts(args: {
  contactIds: string[];
  assignToUserId: string | null;
  actorUserId: string;
  ownerScopeUserId?: string | null;
}): Promise<{ assigned: number }> {
  if (args.contactIds.length === 0) return { assigned: 0 };

  let ids = args.contactIds;
  if (args.ownerScopeUserId) {
    const owned = await db
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .leftJoin(
        crmOrganizations,
        eq(crmOrganizations.id, crmContacts.crmOrganizationId),
      )
      .where(
        and(
          inArray(crmContacts.id, args.contactIds),
          eq(crmOrganizations.accountOwnerId, args.ownerScopeUserId),
        ),
      );
    ids = owned.map((o) => o.id);
  }
  if (ids.length === 0) return { assigned: 0 };

  const updated = await db
    .update(crmContacts)
    .set({ assignedToUserId: args.assignToUserId, updatedAt: new Date() })
    .where(inArray(crmContacts.id, ids))
    .returning({ id: crmContacts.id, orgId: crmContacts.crmOrganizationId });

  const orgIds = [
    ...new Set(
      updated.map((u) => u.orgId).filter((x): x is string => Boolean(x)),
    ),
  ];
  if (orgIds.length > 0) {
    await db
      .update(crmOrganizations)
      .set({ accountOwnerId: args.assignToUserId, updatedAt: new Date() })
      .where(inArray(crmOrganizations.id, orgIds));
  }

  await logEvent({
    action: "admin.action",
    entityType: "crm_contact",
    entityId: ids[0],
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

type ProspectType = "eindklant" | "reseller";

/** Zet het funnel-spoor (eindklant/reseller) op een set prospects. Bepaalt op
 *  welk bord ze staan en of ze de Partner-tab krijgen. Migratie 0052. */
export async function setContactsProspectType(args: {
  contactIds: string[];
  prospectType: ProspectType;
  actorUserId: string;
}): Promise<{ updated: number }> {
  if (args.contactIds.length === 0) return { updated: 0 };
  const updated = await db
    .update(crmContacts)
    .set({ prospectType: args.prospectType, updatedAt: new Date() })
    .where(inArray(crmContacts.id, args.contactIds))
    .returning({ id: crmContacts.id });

  await logEvent({
    action: "admin.action",
    entityType: "crm_contact",
    entityId: args.contactIds[0],
    actorId: args.actorUserId,
    metadata: {
      action: "set_prospect_type",
      prospectType: args.prospectType,
      count: updated.length,
    },
  });

  return { updated: updated.length };
}

/** Zet een hele lead-lijst op een funnel-spoor: alle prospect-members krijgen
 *  het type, en de lijst zelf onthoudt het als default voor nieuwe imports.
 *  Dit is de bulk-classificatie voor verse gescrapede lijsten. */
export async function setLeadListProspectType(args: {
  listId: string;
  prospectType: ProspectType;
  actorUserId: string;
}): Promise<{ updated: number }> {
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

  let updated = 0;
  if (contactIds.length > 0) {
    const rows = await db
      .update(crmContacts)
      .set({ prospectType: args.prospectType, updatedAt: new Date() })
      .where(inArray(crmContacts.id, contactIds))
      .returning({ id: crmContacts.id });
    updated = rows.length;
  }

  await db
    .update(leadLists)
    .set({ listType: args.prospectType, updatedAt: new Date() })
    .where(eq(leadLists.id, args.listId));

  await logEvent({
    action: "admin.action",
    entityType: "lead_list",
    entityId: args.listId,
    actorId: args.actorUserId,
    metadata: {
      action: "set_list_prospect_type",
      prospectType: args.prospectType,
      count: updated,
    },
  });

  return { updated };
}
