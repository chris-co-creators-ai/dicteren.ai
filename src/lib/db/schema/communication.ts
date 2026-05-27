import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";
import { orders, subscriptions } from "./billing";
import { licenses } from "./licensing";
import { affiliates } from "./affiliate";

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
  "org_member_welcome",
  "org_owner_joined",
  "org_member_removed",
  "org_owner_left",
  "org_invite_reminder",
  "org_seats_expanded",
  "org_seats_reduced",
  "org_tier_changed",
  "org_device_revoked",
  "org_subscription_canceled",
  "affiliate_approved",
  "affiliate_first_commission",
  "affiliate_payout_scheduled",
  "affiliate_payout_paid",
  "other",
]);

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

/**
 * Append-only log van elke transactionele email via Resend.
 * Status wordt geüpdatet als Resend webhook events binnenkomen.
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

/** Inkomende berichten vanaf publieke pagina's. */
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

/** Append-only rate-limit log per bucket+ip-hash. */
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

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type NewContactMessage = typeof contactMessages.$inferInsert;
