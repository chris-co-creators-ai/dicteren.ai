import {
  pgTable,
  pgSchema,
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
// Re-export auth-schema tables onder oude namen zodat bestaande imports
// `authUsers` / `authOrganizations` / etc. door blijven werken na de
// migratie van neon_auth → auth schema (per 0006_better_auth_self_host).
import {
  authUser as betterAuthUser,
  authOrg as betterAuthOrg,
  authMember as betterAuthMember,
  authInvitation as betterAuthInvitation,
} from "./auth-schema";

export const authUsers = betterAuthUser;
export const authOrganizations = betterAuthOrg;
export const authMembers = betterAuthMember;
export const authInvitations = betterAuthInvitation;

// ─────────────────────────── Enums ───────────────────────────

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

// ─────────────────────────── Public business tables ───────────────────────────

/**
 * Extends a Neon Auth `user` with Mollie customer-id and personal billing.
 * 1-to-1 with neon_auth.user. Created lazily on first paid order.
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
 * Recurring subscription created at Mollie. One per active license-renewal stream.
 * On 'canceled' / 'completed' the linked license keeps running until expiresAt.
 */
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
    intervalLabel: text("interval_label").notNull(), // e.g. "1 month"
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

/**
 * Extends a Neon Auth `organization` row with billing/business data.
 * 1-to-1 relation: one row per organization. FK is the primary key.
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
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    planId: uuid("plan_id").references(() => plans.id),
    // Number of users (seats) this license covers. Consumer/beta = 1, team = N.
    seats: integer("seats").notNull().default(1),
    // Devices each individual user can activate (e.g. work laptop + home laptop).
    maxActivationsPerSeat: integer("max_activations_per_seat")
      .notNull()
      .default(2),
    activationCount: integer("activation_count").notNull().default(0),
    // Discount snapshot — gekopieerd uit Mollie metadata bij issue.
    // discountType: "free_months" | "lifetime" | "percentage" | "fixed" | null
    discountType: text("discount_type"),
    discountValue: integer("discount_value"),
    // Bron van uitgifte: "self-signup" | "partner:ORG-XXX" | "affiliate:CODE"
    // | "admin-grant" — gespiegeld in Mollie metadata.source.
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

// Maatschappelijke outreach pipeline: stichtingen en non-profits die we
// (gaan) benaderen voor gratis partnercodes. Een partner_organization krijgt
// optioneel één license van type=partner, gedeeld binnen de organisatie.
export const partnerOrganizations = pgTable(
  "partner_organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: text("external_id").notNull(), // "ORG-001" — stabiele key uit CSV
    priority: text("priority"), // "A" / "B" / "C"
    segment: text("segment"),
    organizationName: text("organization_name").notNull(),
    organizationType: text("organization_type"),
    whyRelevant: text("why_relevant"),
    partnershipAngle: text("partnership_angle"),
    openingLine: text("opening_line"),
    offer: text("offer"),
    decisionMaker: text("decision_maker"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    website: text("website"),
    contactUrl: text("contact_url"),
    sourceUrl: text("source_url"),
    sourceStatus: text("source_status"),
    sourceVerifiedAt: text("source_verified_at"),
    accountOwner: text("account_owner"),
    outreachStatus: text("outreach_status").default("Nieuw"),
    lastContactDate: text("last_contact_date"),
    nextAction: text("next_action"),
    followUpDate: text("follow_up_date"),
    responseSummary: text("response_summary"),
    pilotStatus: text("pilot_status").default("Nog niet gestart"),
    freeCodesCount: integer("free_codes_count"),
    licenseId: uuid("license_id").references(() => licenses.id, {
      onDelete: "set null",
    }),
    gdprNotes: text("gdpr_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("partner_orgs_external_id_unique").on(t.externalId),
    index("partner_orgs_outreach_status_idx").on(t.outreachStatus),
    index("partner_orgs_priority_idx").on(t.priority),
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
    // For team licenses: which seat / user is this activation tied to.
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

export const emailStatus = pgEnum("email_status", [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "failed",
]);

export const emailCategory = pgEnum("email_category", [
  "license_issued",
  "welcome",
  "subscription_past_due",
  "subscription_canceled",
  "subscription_renewed",
  "refund",
  "trial_started",
  "trial_reminder_d7",
  "trial_reminder_d13",
  "trial_expired",
  "other",
]);

/**
 * Append-only log of every transactional email we send via Resend.
 * Status is updated as Resend webhook events arrive (delivered → opened → bounced).
 * Visible in /admin/emails for support + audit.
 */
export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resendId: text("resend_id"),
    toAddress: text("to_address").notNull(),
    fromAddress: text("from_address").notNull(),
    subject: text("subject").notNull(),
    category: emailCategory("category").notNull(),
    status: emailStatus("status").notNull().default("sent"),
    errorMessage: text("error_message"),
    errorCode: text("error_code"),
    idempotencyKey: text("idempotency_key"),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    licenseId: uuid("license_id").references(() => licenses.id, {
      onDelete: "set null",
    }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    sentAt: timestamp("sent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
  },
  (t) => [
    index("email_logs_to_idx").on(t.toAddress),
    index("email_logs_user_idx").on(t.userId),
    index("email_logs_category_idx").on(t.category),
    index("email_logs_status_idx").on(t.status),
    index("email_logs_sent_idx").on(t.sentAt),
    uniqueIndex("email_logs_resend_id_unique").on(t.resendId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
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
    properties: jsonb("properties"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("events_type_idx").on(t.eventType),
    index("events_occurred_idx").on(t.occurredAt),
  ],
);

// ─────────────────────────── Inferred types ───────────────────────────

export type AuthUser = typeof authUsers.$inferSelect;
export type AuthOrganization = typeof authOrganizations.$inferSelect;
export type AuthMember = typeof authMembers.$inferSelect;
export type OrganizationBilling = typeof organizationBilling.$inferSelect;
export type NewOrganizationBilling = typeof organizationBilling.$inferInsert;
export type UserBilling = typeof userBilling.$inferSelect;
export type NewUserBilling = typeof userBilling.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type License = typeof licenses.$inferSelect;
export type NewLicense = typeof licenses.$inferInsert;
export type PartnerOrganization = typeof partnerOrganizations.$inferSelect;
export type NewPartnerOrganization = typeof partnerOrganizations.$inferInsert;
export type LicenseActivation = typeof licenseActivations.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
