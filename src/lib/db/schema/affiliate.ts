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
import { orders, payments } from "./billing";
import { licenses } from "./licensing";

// Commerciële resellers die zakelijke klanten doorverkopen en commissie krijgen.
// Niet hetzelfde als partnerOrganizations (= maatschappelijke outreach).

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

export const affiliatePayoutStatus = pgEnum("affiliate_payout_status", [
  "scheduled",
  "processing",
  "paid",
  "failed",
  "canceled",
]);

export const affiliates = pgTable(
  "affiliates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    slug: text("slug"),
    name: text("name").notNull(),
    displayName: text("display_name"),
    welcomeMessage: text("welcome_message"),
    avatarUrl: text("avatar_url"),
    // Brandkit voor de op-maat slug-landingpage (door AM ingevuld op afspraak
    // met de reseller).
    brandColor: text("brand_color"), // accent-hex, bv. #1F8A4C
    brandLogoUrl: text("brand_logo_url"),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    status: affiliateStatus("status").notNull().default("active"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    // Herkomst: self_serve (publieke voordeur), am (admin handmatig), reseller_funnel
    // (gepromoveerd uit de CRM-funnel). Default 'am' → bestaande rijen + admin-create.
    origin: text("origin").notNull().default("am"),
    // Legacy: blijft staan voor backward-compat met bestaande UI/types.
    commissionType: affiliateCommissionType("commission_type")
      .notNull()
      .default("percentage"),
    commissionPct: integer("commission_pct").notNull().default(0),
    commissionFixedCents: integer("commission_fixed_cents")
      .notNull()
      .default(0),
    // Consumer-specifiek (null type = consumer-attribution staat uit)
    consumerCommissionType: affiliateCommissionType("consumer_commission_type"),
    consumerCommissionPct: integer("consumer_commission_pct").notNull().default(0),
    consumerCommissionFixedCents: integer("consumer_commission_fixed_cents")
      .notNull()
      .default(0),
    consumerCommissionDurationMonths: integer(
      "consumer_commission_duration_months",
    )
      .notNull()
      .default(0),
    consumerRecurringCommissionPct: integer(
      "consumer_recurring_commission_pct",
    )
      .notNull()
      .default(0),
    consumerRecurringCommissionFixedCents: integer(
      "consumer_recurring_commission_fixed_cents",
    )
      .notNull()
      .default(0),
    // Business-specifiek
    businessCommissionType: affiliateCommissionType("business_commission_type"),
    businessCommissionPct: integer("business_commission_pct").notNull().default(0),
    businessCommissionFixedCents: integer("business_commission_fixed_cents")
      .notNull()
      .default(0),
    businessCommissionDurationMonths: integer(
      "business_commission_duration_months",
    )
      .notNull()
      .default(0),
    businessRecurringCommissionPct: integer(
      "business_recurring_commission_pct",
    )
      .notNull()
      .default(0),
    businessRecurringCommissionFixedCents: integer(
      "business_recurring_commission_fixed_cents",
    )
      .notNull()
      .default(0),
    // Payout
    minimumPayoutCents: integer("minimum_payout_cents").notNull().default(2500),
    payoutMethod: text("payout_method"),
    payoutDetails: jsonb("payout_details"),
    internalNotes: text("internal_notes"),
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
    uniqueIndex("affiliates_slug_unique").on(t.slug),
    uniqueIndex("affiliates_contact_email_unique").on(t.contactEmail),
    uniqueIndex("affiliates_user_unique").on(t.userId),
    index("affiliates_status_idx").on(t.status),
  ],
);

export const affiliatePayouts = pgTable(
  "affiliate_payouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    affiliateId: uuid("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    periodYear: integer("period_year").notNull(),
    periodMonth: integer("period_month").notNull(),
    totalCents: integer("total_cents").notNull(),
    commissionCount: integer("commission_count").notNull(),
    status: affiliatePayoutStatus("status").notNull().default("scheduled"),
    sepaBatchRef: text("sepa_batch_ref"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failedReason: text("failed_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("affiliate_payouts_affiliate_idx").on(t.affiliateId),
    index("affiliate_payouts_status_idx").on(t.status),
    uniqueIndex("affiliate_payouts_period_unique").on(
      t.affiliateId,
      t.periodYear,
      t.periodMonth,
    ),
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
    organizationId: uuid("organization_id").references(
      () => authOrganizations.id,
      { onDelete: "set null" },
    ),
    attributionSource: text("attribution_source").notNull().default("url-ref"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
  },
  (t) => [
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
    basisAmountCents: integer("basis_amount_cents").notNull(),
    seats: integer("seats").notNull().default(1),
    commissionType: affiliateCommissionType("commission_type").notNull(),
    commissionPct: integer("commission_pct").notNull(),
    commissionFixedCents: integer("commission_fixed_cents").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: affiliateCommissionStatus("status").notNull().default("pending"),
    // v2: lockup + renewal tracking
    customerType: text("customer_type"),
    unlocksAt: timestamp("unlocks_at", { withTimezone: true }),
    isRenewal: boolean("is_renewal").notNull().default(false),
    sequenceNumber: integer("sequence_number").notNull().default(1),
    voidedReason: text("voided_reason"),
    // Self-referral flag (PRD self-serve-referral, Fase 3.4): verdachte commissie
    // (koper op hetzelfde bedrijfsdomein als de affiliate) → hold voor review i.p.v.
    // auto-payable. AM keurt goed (needs_review=false) of void't. Geen harde blok.
    needsReview: boolean("needs_review").notNull().default(false),
    reviewReason: text("review_reason"),
    payoutId: uuid("payout_id").references(() => affiliatePayouts.id, {
      onDelete: "set null",
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidReference: text("paid_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("affiliate_commissions_order_seq_unique").on(
      t.orderId,
      t.sequenceNumber,
    ),
    index("affiliate_commissions_affiliate_idx").on(t.affiliateId),
    index("affiliate_commissions_status_idx").on(t.status),
    index("affiliate_commissions_unlocks_idx").on(t.unlocksAt),
    index("affiliate_commissions_payout_idx").on(t.payoutId),
  ],
);

export type Affiliate = typeof affiliates.$inferSelect;
export type NewAffiliate = typeof affiliates.$inferInsert;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type NewAffiliateReferral = typeof affiliateReferrals.$inferInsert;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;
export type NewAffiliateCommission = typeof affiliateCommissions.$inferInsert;
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;
export type NewAffiliatePayout = typeof affiliatePayouts.$inferInsert;
