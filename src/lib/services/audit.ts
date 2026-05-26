import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export type AuditAction =
  | "license.created"
  | "license.activated"
  | "license.deactivated"
  | "license.revoked"
  | "license.expired"
  | "license.extended"
  | "license.reset"
  | "order.created"
  | "order.paid"
  | "order.failed"
  | "order.refunded"
  | "subscription.creation_failed"
  | "checkout.started"
  | "checkout.completed"
  | "discount.redeemed"
  | "organization.created"
  | "organization.member_added"
  | "organization.member_removed"
  | "admin.login"
  | "admin.action"
  | "partner.created"
  | "partner.bulk_created"
  | "partner.archived"
  | "partner.updated"
  | "partner.code_issued"
  | "partner.task_created"
  | "partner.task_done"
  | "partner.task_reopened"
  | "partner.task_deleted"
  | "partner.comment_added"
  | "affiliate.created"
  | "affiliate.updated"
  | "affiliate.attributed"
  | "affiliate.commission_recorded"
  | "affiliate.commission_status_changed"
  | "organization.billing_updated"
  | "organization.member_invited"
  | "organization.member_joined"
  | "organization.member_left"
  | "organization.invitation_canceled"
  | "organization.invitation_resent"
  | "organization.invitation_expired"
  | "organization.ownership_transferred"
  | "organization.seat_assigned"
  | "organization.seat_unassigned"
  | "organization.seat_reassigned"
  | "organization.seats_expanded"
  | "organization.seats_reduced"
  | "organization.tier_changed"
  | "organization.subscription_replaced"
  | "organization.subscription_failed"
  | "organization.proration_charged"
  | "organization.proration_refunded"
  | "organization.seat_limit_warning"
  | "license.activation_revoked"
  | "license.seat_claimed"
  | "license.seat_released"
  | "license.code_revealed";

type AuditParams = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Audit log — written to `events` with eventType="audit.<action>".
 * For high-volume product events use `trackEvent` instead.
 */
export async function logEvent(params: AuditParams): Promise<void> {
  try {
    await db.insert(events).values({
      eventType: `audit.${params.action}`,
      userId: params.actorId ?? null,
      properties: {
        entityType: params.entityType,
        entityId: params.entityId,
        ...(params.metadata ?? {}),
      },
    });
  } catch (err) {
    console.warn("[audit] failed to log", params.action, err);
  }
}

/** Audit-feed van handelingen door één staff-user. Wordt gebruikt in
 *  /admin/settings/staff per AM-card. */
export async function getEventsByActor(
  actorUserId: string,
  limit = 100,
): Promise<
  Array<{
    id: string;
    eventType: string;
    properties: Record<string, unknown> | null;
    occurredAt: Date;
  }>
> {
  const rows = await db
    .select({
      id: events.id,
      eventType: events.eventType,
      properties: events.properties,
      occurredAt: events.occurredAt,
    })
    .from(events)
    .where(eq(events.userId, actorUserId))
    .orderBy(desc(events.occurredAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    properties: r.properties as Record<string, unknown> | null,
    occurredAt: r.occurredAt,
  }));
}

/** Audit-feed voor één org. Pakt alle audit-events waar properties.entityId =
 *  orgId OF properties.entityType = 'organization' EN entityId=orgId OF
 *  entityType=license EN entityId IN licenses van die org. MVP: pak alleen
 *  events waar properties->>'entityId' matched orgId OF audit.organization.*. */
export async function getOrgAuditFeed(
  orgId: string,
  licenseIds: string[] = [],
  limit = 100,
): Promise<
  Array<{
    id: string;
    eventType: string;
    properties: Record<string, unknown> | null;
    occurredAt: Date;
    userId: string | null;
  }>
> {
  // Postgres JSONB lookup. Idiomatic via drizzle: sql tag.
  const idsForSql = [orgId, ...licenseIds];
  const idsCsv = idsForSql.map((id) => `'${id.replace(/'/g, "")}'`).join(",");

  if (idsCsv.length === 0) return [];

  const rows = await db.execute<{
    id: string;
    event_type: string;
    properties: Record<string, unknown> | null;
    occurred_at: Date;
    user_id: string | null;
  }>(sql.raw(`
    SELECT id, event_type, properties, occurred_at, user_id
    FROM events
    WHERE event_type LIKE 'audit.%'
      AND properties->>'entityId' IN (${idsCsv})
    ORDER BY occurred_at DESC
    LIMIT ${Math.min(500, Math.max(1, limit))}
  `));

  const list = (rows as unknown as { rows?: typeof rows }).rows ?? rows;
  const items = Array.isArray(list) ? list : [];
  return items.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    properties: r.properties,
    occurredAt: r.occurred_at,
    userId: r.user_id,
  }));
}

/** Product-analytics event-namen — typed zodat typo's compile-time falen. */
export type TrackEventName =
  | "trial_claimed"
  | "license_activation_failed"
  | "license_activation_succeeded"
  | "checkout_started"
  | "subscription_renewed"
  | "subscription_creation_failed"
  | "payment_completed"
  | "affiliate_commission_recorded";

/**
 * Product/commercial analytics. Never include user content (transcripts,
 * audio, raw input). Use anonymous-friendly keys.
 */
export async function trackEvent(
  name: TrackEventName,
  properties?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(events).values({
      eventType: name,
      properties: (properties as object) ?? {},
    });
  } catch (err) {
    console.warn("[analytics] failed to track", name, err);
  }
}
