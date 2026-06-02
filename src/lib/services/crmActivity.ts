import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmEvents, crmOrganizations } from "@/lib/db/schema";

// Dicteren.ai — CRM-activiteit per actor (AM). De rijke CRM-historie zit in
// crm_events (status_changed, contact_added, email_*, task_*, interaction_logged,
// outreach_*). Dit geeft een AM "wat heb ik gedaan" en de admin een per-AM
// governance-view. Leunt op de bestaande crm_events-laag; geen nieuwe tabel.

export type CrmActivityItem = {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  orgId: string | null;
  orgName: string | null;
};

/** Chronologische CRM-activiteit van één AM (org-naam mee voor context). */
export async function listActorCrmActivity(
  actorUserId: string,
  limit = 50,
): Promise<CrmActivityItem[]> {
  const rows = await db
    .select({
      id: crmEvents.id,
      kind: crmEvents.kind,
      payload: crmEvents.payload,
      createdAt: crmEvents.createdAt,
      orgId: crmEvents.crmOrganizationId,
      orgName: crmOrganizations.name,
    })
    .from(crmEvents)
    .leftJoin(
      crmOrganizations,
      eq(crmOrganizations.id, crmEvents.crmOrganizationId),
    )
    .where(eq(crmEvents.actorUserId, actorUserId))
    .orderBy(desc(crmEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as string,
    payload: (r.payload as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
    orgId: r.orgId,
    orgName: r.orgName,
  }));
}

/** Activiteit voor één specifieke organisatie (voor het side-panel, alle actoren). */
export async function listOrgActivity(
  orgId: string,
  limit = 50,
): Promise<CrmActivityItem[]> {
  const rows = await db
    .select({
      id: crmEvents.id,
      kind: crmEvents.kind,
      payload: crmEvents.payload,
      createdAt: crmEvents.createdAt,
      orgId: crmEvents.crmOrganizationId,
      orgName: crmOrganizations.name,
    })
    .from(crmEvents)
    .leftJoin(
      crmOrganizations,
      eq(crmOrganizations.id, crmEvents.crmOrganizationId),
    )
    .where(eq(crmEvents.crmOrganizationId, orgId))
    .orderBy(desc(crmEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as string,
    payload: (r.payload as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
    orgId: r.orgId,
    orgName: r.orgName,
  }));
}
