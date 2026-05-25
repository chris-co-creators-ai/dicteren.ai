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

// ─────────────────────────── Affiliate program ───────────────────────────
//
// Commerciële resellers die zakelijke klanten doorverkopen en commissie krijgen.
// LET OP: NIET hetzelfde als `partnerOrganizations` (= maatschappelijke outreach).
//
// Attributie: lifetime via affiliateReferrals.userId. Eerste-touch wins (uniek
// op userId). Bij elke paid order van een referred user → commission record.

export const affiliateStatus = pgEnum("affiliate_status", [
  "pending",
  "active",
  "paused",
  "disabled",
]);

export const affiliateCommissionType = pgEnum("affiliate_commission_type", [
  "percentage",
  "fixed_per_seat",
]);

export const affiliateCommissionStatus = pgEnum(
  "affiliate_commission_status",
  ["pending", "payable", "paid", "voided"],
);

export const affiliates = pgTable(
  "affiliates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    // Optionele koppeling naar een auth.user (zodat reseller via /affiliate/
    // dashboard kan inloggen). Mag null blijven als affiliate puur admin-zijdig is.
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    status: affiliateStatus("status").notNull().default("active"),
    commissionType: affiliateCommissionType("commission_type")
      .notNull()
      .default("percentage"),
    /** 0-100, geldt als commissionType = "percentage". */
    commissionPct: integer("commission_pct").notNull().default(0),
    /** Cents per seat, geldt als commissionType = "fixed_per_seat". */
    commissionFixedCents: integer("commission_fixed_cents")
      .notNull()
      .default(0),
    payoutMethod: text("payout_method"),
    /** IBAN, paypal-mail, etc. JSONB zodat we flexibel kunnen uitbreiden. */
    payoutDetails: jsonb("payout_details"),
    internalNotes: text("internal_notes"),
    /** Lifetime cumulatief — incrementeel bijgewerkt bij commission paid. */
    totalEarnedCents: integer("total_earned_cents").notNull().default(0),
    totalPaidCents: integer("total_paid_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("affiliates_code_unique").on(t.code),
    uniqueIndex("affiliates_contact_email_unique").on(t.contactEmail),
    uniqueIndex("affiliates_user_unique").on(t.userId),
    index("affiliates_status_idx").on(t.status),
  ],
);

export const affiliateReferrals = pgTable(
  "affiliate_referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    /** Voor zakelijke orders kopiëren we de orgId hier zodat admin-views op
     *  org-niveau de affiliate kunnen vinden. */
    organizationId: uuid("organization_id").references(
      () => authOrganizations.id,
      { onDelete: "set null" },
    ),
    /** "url-ref" (klik op affiliate-link bij signup) of "admin-grant" (handmatig). */
    attributionSource: text("attribution_source").notNull().default("url-ref"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Eerste paid order — null tot dan. Voor reseller-dashboard ("conversie"). */
    convertedAt: timestamp("converted_at", { withTimezone: true }),
  },
  (t) => [
    // 1 affiliate per user, lifetime first-touch.
    uniqueIndex("affiliate_referrals_user_unique").on(t.userId),
    index("affiliate_referrals_affiliate_idx").on(t.affiliateId),
    index("affiliate_referrals_org_idx").on(t.organizationId),
  ],
);

export const affiliateCommissions = pgTable(
  "affiliate_commissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    referralId: uuid("referral_id").references(() => affiliateReferrals.id, {
      onDelete: "set null",
    }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    licenseId: uuid("license_id").references(() => licenses.id, {
      onDelete: "set null",
    }),
    paymentId: uuid("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    /** Order-amount waarop berekend (cents). */
    basisAmountCents: integer("basis_amount_cents").notNull(),
    /** Voor seat-based commission. */
    seats: integer("seats").notNull().default(1),
    /** Snapshot van affiliate-config op moment van issue (kan later wijzigen). */
    commissionType: affiliateCommissionType("commission_type").notNull(),
    commissionPct: integer("commission_pct").notNull(),
    commissionFixedCents: integer("commission_fixed_cents").notNull(),
    /** Berekend resultaat. */
    amountCents: integer("amount_cents").notNull(),
    status: affiliateCommissionStatus("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Factuurnr / payout-referentie voor de affiliate-uitbetaling. */
    paidReference: text("paid_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // 1 commission per order — voorkomt dubbele records bij webhook-retries.
    uniqueIndex("affiliate_commissions_order_unique").on(t.orderId),
    index("affiliate_commissions_affiliate_idx").on(t.affiliateId),
    index("affiliate_commissions_status_idx").on(t.status),
  ],
);

// ─────────────────────────── CRM extensions ───────────────────────────
//
// Customer-attributes + lead-lists + per-admin column-prefs voor een volwaardig
// CRM. Stage/temperature voor pipeline-tracking. Lijsten voor GTM-engineering
// (prospecting → sales-overdracht). Column-prefs persisted per admin-user.

export const customerStage = pgEnum("customer_stage", [
  "lead",
  "prospect",
  "mql",
  "sql",
  "customer",
  "lost",
  "churned",
]);

export const customerTemperature = pgEnum("customer_temperature", [
  "cold",
  "lukewarm",
  "warm",
  "hot",
]);

export const listColor = pgEnum("list_color", [
  "blue",
  "green",
  "orange",
  "red",
  "purple",
  "gray",
  "navy",
  "aqua",
]);

/** Per-user CRM-attributen die we naast auth.user opslaan zodat we niet aan
 *  Better Auth's schema komen. Lazy: rij wordt pas aangemaakt bij eerste
 *  edit. Default-status komt uit identity-funnel als rij ontbreekt. */
export const customerAttributes = pgTable("customer_attributes", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  stage: customerStage("stage"),
  temperature: customerTemperature("temperature"),
  assignedToUserId: uuid("assigned_to_user_id").references(
    () => authUsers.id,
    { onDelete: "set null" },
  ),
  notes: text("notes"),
  customFields: jsonb("custom_fields"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leadLists = pgTable(
  "lead_lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    color: listColor("color").notNull().default("blue"),
    ownerUserId: uuid("owner_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    /** false = privé voor owner, true = zichtbaar voor alle admins. */
    isShared: boolean("is_shared").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("lead_lists_owner_idx").on(t.ownerUserId),
    index("lead_lists_shared_idx").on(t.isShared),
  ],
);

export const leadListMembers = pgTable(
  "lead_list_members",
  {
    listId: uuid("list_id")
      .notNull()
      .references(() => leadLists.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    addedByUserId: uuid("added_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("lead_list_members_pk_unique").on(t.listId, t.userId),
    index("lead_list_members_user_idx").on(t.userId),
  ],
);

/** Per-admin opslag van zichtbare kolommen + hun volgorde in /admin/crm.
 *  visibleColumns/columnOrder zijn arrays van column-keys (strings). */
export const crmColumnPrefs = pgTable("crm_column_prefs", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  visibleColumns: jsonb("visible_columns").notNull().default([]),
  columnOrder: jsonb("column_order").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────── Contact / partnership messages ───────────

export const contactMessageStatus = pgEnum("contact_message_status", [
  "new",
  "in_progress",
  "closed",
  "spam",
]);

export const contactMessageKind = pgEnum("contact_message_kind", [
  "general",
  "sales",
  "support",
  "partnership",
  "quote_request",
]);

/** Inkomende berichten vanaf publieke pagina's (contact, word-partner,
 *  offerte-aanvraag). Worden in /admin/messages verwerkt door account-managers.
 *  IP wordt gehashed (SHA-256) zodat we GDPR-conform throttle/spam-detectie
 *  doen zonder raw-IP op te slaan. */
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: contactMessageKind("kind").notNull().default("general"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company"),
    phone: text("phone"),
    subject: text("subject"),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    status: contactMessageStatus("status").notNull().default("new"),
    assignedToUserId: uuid("assigned_to_user_id").references(
      () => authUsers.id,
      { onDelete: "set null" },
    ),
    linkedUserId: uuid("linked_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    linkedAffiliateId: uuid("linked_affiliate_id").references(
      () => affiliates.id,
      { onDelete: "set null" },
    ),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("contact_messages_status_idx").on(t.status),
    index("contact_messages_kind_idx").on(t.kind),
  ],
);

/** Append-only rate-limit log per bucket+ip. Tabel-based throttling werkt
 *  multi-instance op Vercel (Upstash/Redis is overhead voor lage volumes). */
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bucketKey: text("bucket_key").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rate_limit_events_lookup_idx").on(
      t.bucketKey,
      t.ipHash,
      t.createdAt,
    ),
  ],
);

/** Custom CRM-kolommen (door admin gedefinieerd). Waardes worden opgeslagen
 *  in customer_attributes.custom_fields als { [key]: value }. */
export const crmCustomColumns = pgTable(
  "crm_custom_columns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    /** "text" | "number" | "date" | "select" */
    type: text("type").notNull(),
    /** Voor type=select: array van opties. */
    options: jsonb("options"),
    ownerUserId: uuid("owner_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    isShared: boolean("is_shared").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("crm_custom_columns_key_unique").on(t.key)],
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
export type Affiliate = typeof affiliates.$inferSelect;
export type NewAffiliate = typeof affiliates.$inferInsert;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type NewAffiliateReferral = typeof affiliateReferrals.$inferInsert;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;
export type NewAffiliateCommission = typeof affiliateCommissions.$inferInsert;
export type CustomerAttributes = typeof customerAttributes.$inferSelect;
export type NewCustomerAttributes = typeof customerAttributes.$inferInsert;
export type LeadList = typeof leadLists.$inferSelect;
export type NewLeadList = typeof leadLists.$inferInsert;
export type LeadListMember = typeof leadListMembers.$inferSelect;
export type NewLeadListMember = typeof leadListMembers.$inferInsert;
export type CrmColumnPrefs = typeof crmColumnPrefs.$inferSelect;
export type CrmCustomColumn = typeof crmCustomColumns.$inferSelect;
export type NewCrmCustomColumn = typeof crmCustomColumns.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
