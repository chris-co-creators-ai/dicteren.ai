// Dicteren.ai — Org seat-management bijbehorende tabellen
//
// 1. org_subscription_history — audit van seat-mutaties + tier-overgangen
// 2. org_seat_warnings        — dedup voor 80%/100%-warning-emails
// 3. invite_reminders_sent    — dedup voor 24u invite-reminder

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { authUsers, authOrganizations, authInvitations } from "./auth-bridge";

export const orgSubscriptionHistory = pgTable(
  "org_subscription_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => authOrganizations.id, { onDelete: "cascade" }),
    oldSeats: integer("old_seats").notNull(),
    newSeats: integer("new_seats").notNull(),
    oldAmountCents: integer("old_amount_cents").notNull(),
    newAmountCents: integer("new_amount_cents").notNull(),
    oldTier: text("old_tier"),
    newTier: text("new_tier"),
    oldMollieSubscriptionId: text("old_mollie_subscription_id"),
    newMollieSubscriptionId: text("new_mollie_subscription_id"),
    prorataChargeCents: integer("prorata_charge_cents"),
    prorataPaymentId: text("prorata_payment_id"),
    reason: text("reason").notNull(),
    actorUserId: uuid("actor_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("org_sub_history_org_idx").on(t.organizationId),
    index("org_sub_history_created_idx").on(t.createdAt),
  ],
);

export const orgSeatWarnings = pgTable("org_seat_warnings", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => authOrganizations.id, { onDelete: "cascade" }),
  warnedAt80: timestamp("warned_at_80", { withTimezone: true }),
  warnedAt100: timestamp("warned_at_100", { withTimezone: true }),
  lastResetAt: timestamp("last_reset_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const inviteRemindersSent = pgTable("invite_reminders_sent", {
  invitationId: uuid("invitation_id")
    .primaryKey()
    .references(() => authInvitations.id, { onDelete: "cascade" }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type OrgSubscriptionHistory = typeof orgSubscriptionHistory.$inferSelect;
export type NewOrgSubscriptionHistory =
  typeof orgSubscriptionHistory.$inferInsert;
export type OrgSeatWarnings = typeof orgSeatWarnings.$inferSelect;
export type InviteRemindersSent = typeof inviteRemindersSent.$inferSelect;
