import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { authUsers, authOrganizations } from "./auth-bridge";

/**
 * Extends auth.user met Mollie customer-id en personal billing.
 * 1-to-1 met auth.user. Created lazily op first paid order.
 */
export const userBilling = pgTable("user_billing", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  mollieCustomerId: text("mollie_customer_id"),
  billingEmail: text("billing_email"),
  countryCode: text("country_code"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  postalCode: text("postal_code"),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Extends auth.organization met billing/business data. 1-to-1 relation.
 */
export const organizationBilling = pgTable("organization_billing", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => authOrganizations.id, { onDelete: "cascade" }),
  billingEmail: text("billing_email"),
  vatNumber: text("vat_number"),
  countryCode: text("country_code"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  postalCode: text("postal_code"),
  city: text("city"),
  purchaseOrderNumber: text("purchase_order_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Per-user page-blocks bovenop role-defaults. */
export const staffPageBlocks = pgTable("staff_page_blocks", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  blockedPaths: jsonb("blocked_paths").notNull().default([]),
  notes: text("notes"),
  updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserBilling = typeof userBilling.$inferSelect;
export type NewUserBilling = typeof userBilling.$inferInsert;
export type OrganizationBilling = typeof organizationBilling.$inferSelect;
export type NewOrganizationBilling = typeof organizationBilling.$inferInsert;
