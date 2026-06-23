import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";

// Vrienden uitnodigen (PRD vrienden-uitnodigen): refer-a-friend met GRATIS MAANDEN,
// dubbelzijdig, geen cash. Apart van `affiliates` (= cash-reseller-programma).
// De persoonlijke invite-code staat als `referral_code` op auth.user.

export const referralStatus = pgEnum("referral_status", [
  "pending", // vriend aangemeld, nog niet betalend
  "qualified", // vriend is betalend geworden → beide maanden toegekend
  "void", // ongedaan (misbruik / handmatig)
]);

export const referralSource = pgEnum("referral_source", ["link", "code"]);

export const referralRewardRole = pgEnum("referral_reward_role", [
  "referrer",
  "referred",
]);

export const referralRewardStatus = pgEnum("referral_reward_status", [
  "pending", // toegekend, nog niet uitgeleverd
  "applied", // gratis maand toegepast op licentie/abo
  "void",
]);

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referrerUserId: uuid("referrer_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    referredUserId: uuid("referred_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    referredEmail: text("referred_email"),
    referrerCode: text("referrer_code"),
    status: referralStatus("status").notNull().default("pending"),
    source: referralSource("source").notNull().default("link"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
  },
  (t) => [
    // First-touch: één referral per aangebrachte (de eerste aanbrenger wint).
    uniqueIndex("referrals_referred_unique").on(t.referredUserId),
    index("referrals_referrer_idx").on(t.referrerUserId),
    index("referrals_status_idx").on(t.status),
  ],
);

export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referralId: uuid("referral_id")
      .notNull()
      .references(() => referrals.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: referralRewardRole("role").notNull(),
    months: integer("months").notNull().default(1),
    status: referralRewardStatus("status").notNull().default("pending"),
    applyMethod: text("apply_method"), // license_extend | mollie_shift | …
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Idempotent: één reward per rol per referral.
    uniqueIndex("referral_rewards_referral_role_unique").on(
      t.referralId,
      t.role,
    ),
    index("referral_rewards_user_idx").on(t.userId),
    index("referral_rewards_status_idx").on(t.status),
  ],
);

export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
export type ReferralReward = typeof referralRewards.$inferSelect;
export type NewReferralReward = typeof referralRewards.$inferInsert;
