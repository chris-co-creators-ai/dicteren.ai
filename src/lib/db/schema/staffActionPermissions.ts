// Dicteren.ai — Per-user actie-rechten (Laag B in AM-team PRD)
//
// Granulair per-actie naast de bestaande page-blocks. Admin krijgt geen rij
// (admin = automatisch alles). Account-managers krijgen één rij met defaults.

import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";

export const staffActionPermissions = pgTable("staff_action_permissions", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  permissions: jsonb("permissions").notNull().default({}),
  updatedBy: uuid("updated_by").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type StaffActionPermissions =
  typeof staffActionPermissions.$inferSelect;
export type NewStaffActionPermissions =
  typeof staffActionPermissions.$inferInsert;

/** Bron-van-waarheid voor alle bekende actie-keys. */
export const ACTION_KEYS = [
  "crm_org.create",
  "crm_org.update",
  "crm_org.delete",
  "crm_org.change_status",
  "crm_org.send_payment_link",
  "crm_org.resend_payment_link",
  "crm_org.mark_paid_offline",
  "crm_contact.create",
  "crm_contact.delete",
  "crm_task.create",
  "crm_task.complete",
  "customer.update_attributes",
  "customer.message",
  "license.grant_free",
  "license.revoke",
  "affiliate.view",
  "affiliate.manage",
  "discount.create",
  "audit.undo_own",
  "audit.undo_any",
] as const;

export type ActionKey = (typeof ACTION_KEYS)[number];
export type ActionPermissions = Partial<Record<ActionKey, boolean>>;

/** Defaults voor rol = account_manager. */
export const AM_DEFAULT_PERMISSIONS: ActionPermissions = {
  "crm_org.create": true,
  "crm_org.update": true,
  "crm_org.delete": false,
  "crm_org.change_status": true,
  "crm_org.send_payment_link": true,
  "crm_org.resend_payment_link": true,
  "crm_org.mark_paid_offline": false,
  "crm_contact.create": true,
  "crm_contact.delete": true,
  "crm_task.create": true,
  "crm_task.complete": true,
  "customer.update_attributes": true,
  "customer.message": true,
  "license.grant_free": false,
  "license.revoke": false,
  "affiliate.view": true,
  "affiliate.manage": false,
  "discount.create": false,
  "audit.undo_own": true,
  "audit.undo_any": false,
};
