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

export const licenseStatus = pgEnum("license_status", [
  "trial",
  "active",
  "past_due",
  "canceled",
  "expired",
  "refunded",
  "revoked",
]);

export const licenseType = pgEnum("license_type", [
  "beta",
  "consumer",
  "team",
  "partner",
]);

export const planPeriod = pgEnum("plan_period", [
  "monthly",
  "quarterly",
  "yearly",
  "lifetime",
]);

export const customerType = pgEnum("customer_type", [
  "consumer",
  "organization",
]);

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  customerType: customerType("customer_type").notNull(),
  period: planPeriod("period").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("EUR"),
  isActive: boolean("is_active").notNull().default(true),
  isPerSeat: boolean("is_per_seat").notNull().default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    codeHash: text("code_hash").notNull(),
    type: licenseType("type").notNull(),
    status: licenseStatus("status").notNull().default("trial"),
    customerEmail: text("customer_email"),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(
      () => authOrganizations.id,
      { onDelete: "set null" },
    ),
    orderId: uuid("order_id"),
    planId: uuid("plan_id").references(() => plans.id),
    seats: integer("seats").notNull().default(1),
    maxActivationsPerSeat: integer("max_activations_per_seat")
      .notNull()
      .default(2),
    activationCount: integer("activation_count").notNull().default(0),
    discountType: text("discount_type"),
    discountValue: integer("discount_value"),
    source: text("source").default("self-signup"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("licenses_code_unique").on(t.code),
    uniqueIndex("licenses_code_hash_unique").on(t.codeHash),
    index("licenses_status_idx").on(t.status),
    index("licenses_type_idx").on(t.type),
    index("licenses_email_idx").on(t.customerEmail),
    index("licenses_user_idx").on(t.userId),
    index("licenses_org_idx").on(t.organizationId),
    index("licenses_source_idx").on(t.source),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    platform: text("platform"),
    appVersion: text("app_version"),
    deviceName: text("device_name"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("devices_fingerprint_unique").on(t.fingerprint)],
);

export const licenseActivations = pgTable(
  "license_activations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    activatedAt: timestamp("activated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    lastTokenIssuedAt: timestamp("last_token_issued_at", {
      withTimezone: true,
    }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("activations_license_device_unique").on(
      t.licenseId,
      t.deviceId,
    ),
    index("activations_license_idx").on(t.licenseId),
    index("activations_user_idx").on(t.userId),
  ],
);

export type License = typeof licenses.$inferSelect;
export type NewLicense = typeof licenses.$inferInsert;
export type LicenseActivation = typeof licenseActivations.$inferSelect;
export type Plan = typeof plans.$inferSelect;
