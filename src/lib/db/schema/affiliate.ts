import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
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

export const affiliates = pgTable(
  "affiliates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    status: affiliateStatus("status").notNull().default("active"),
    commissionType: affiliateCommissionType("commission_type")
      .notNull()
      .default("percentage"),
    commissionPct: integer("commission_pct").notNull().default(0),
    commissionFixedCents: integer("commission_fixed_cents")
      .notNull()
      .default(0),
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
    uniqueIndex("affiliate_commissions_order_unique").on(t.orderId),
    index("affiliate_commissions_affiliate_idx").on(t.affiliateId),
    index("affiliate_commissions_status_idx").on(t.status),
  ],
);

export type Affiliate = typeof affiliates.$inferSelect;
export type NewAffiliate = typeof affiliates.$inferInsert;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type NewAffiliateReferral = typeof affiliateReferrals.$inferInsert;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;
export type NewAffiliateCommission = typeof affiliateCommissions.$inferInsert;
