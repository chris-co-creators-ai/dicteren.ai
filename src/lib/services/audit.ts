import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

type AuditAction =
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
  | "affiliate.created"
  | "affiliate.updated"
  | "affiliate.attributed"
  | "affiliate.commission_recorded"
  | "affiliate.commission_status_changed"
  | "organization.billing_updated"
  | "organization.member_invited";

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

/**
 * Product/commercial analytics. Never include user content (transcripts,
 * audio, raw input). Use anonymous-friendly keys.
 */
export async function trackEvent(
  name: string,
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
