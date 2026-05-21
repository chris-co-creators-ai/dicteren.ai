import "server-only";
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
  | "checkout.started"
  | "checkout.completed"
  | "discount.redeemed"
  | "organization.created"
  | "organization.member_added"
  | "organization.member_removed"
  | "admin.login"
  | "admin.action";

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
