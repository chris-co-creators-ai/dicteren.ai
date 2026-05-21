// Dicteren.ai — Audit Service
// Shared mechanics: event logging for all platform actions
// Domain logic (what events to log, when) stays in actions

import type { AuditEvent } from "@/lib/types";

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

interface LogEventParams {
  action: AuditAction;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event
 * TODO: Write to database once Neon is connected
 */
export async function logEvent(params: LogEventParams): Promise<void> {
  const event: Omit<AuditEvent, "id"> = {
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    actorId: params.actorId ?? null,
    metadata: params.metadata ?? {},
    createdAt: new Date(),
  };

  // TODO: Insert into audit_log table
  // For now, log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[audit]", event.action, event.entityType, event.entityId);
  }
}

/**
 * Track analytics event (product/commercial, never user content)
 * TODO: Connect to analytics provider (PostHog/Plausible)
 */
export async function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  // TODO: Send to analytics provider
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", name, properties);
  }
}
