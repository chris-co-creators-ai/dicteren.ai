import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { authUsers, authOrganizations } from "./auth-bridge";
import { plans, licenses, customerType } from "./licensing";

export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "canceled",
  "refunded",
]);

export const discountType = pgEnum("discount_type", [
  "percentage",
  "fixed",
  "free_months",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "canceled",
  "completed",
  "suspended",
  "past_due",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(
      () => authOrganizations.id,
      { onDelete: "set null" },
    ),
    planId: uuid("plan_id").references(() => plans.id),
    quantity: integer("quantity").notNull().default(1),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    status: orderStatus("status").notNull().default("pending"),
    discountCodeId: uuid("discount_code_id"),
    molliePaymentId: text("mollie_payment_id"),
    mollieCheckoutUrl: text("mollie_checkout_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    uniqueIndex("orders_mollie_payment_unique").on(t.molliePaymentId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    molliePaymentId: text("mollie_payment_id").notNull(),
    status: text("status").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    rawWebhookPayload: jsonb("raw_webhook_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mollieSubscriptionId: text("mollie_subscription_id").notNull(),
    mollieCustomerId: text("mollie_customer_id").notNull(),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(
      () => authOrganizations.id,
      { onDelete: "set null" },
    ),
    licenseId: uuid("license_id").references(() => licenses.id, {
      onDelete: "set null",
    }),
    planId: uuid("plan_id").references(() => plans.id),
    status: subscriptionStatus("status").notNull().default("active"),
    intervalLabel: text("interval_label").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    seats: integer("seats").notNull().default(1),
    nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("subscriptions_mollie_id_unique").on(t.mollieSubscriptionId),
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_org_idx").on(t.organizationId),
    index("subscriptions_status_idx").on(t.status),
  ],
);

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    type: discountType("type").notNull(),
    value: integer("value").notNull(),
    appliesTo: customerType("applies_to"),
    planId: uuid("plan_id").references(() => plans.id),
    minimumSeats: integer("minimum_seats"),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    affiliateId: uuid("affiliate_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("discount_codes_code_unique").on(t.code)],
);

export type Order = typeof orders.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type DiscountCode = typeof discountCodes.$inferSelect;
