import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";
import { licenses } from "./licensing";

// Maatschappelijke outreach pipeline. Een partner_organization krijgt
// optioneel één license van type=partner, gedeeld binnen de organisatie.
export const partnerOrganizations = pgTable(
  "partner_organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: text("external_id").notNull(),
    priority: text("priority"),
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

export const partnerTasks = pgTable(
  "partner_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partnerOrgId: uuid("partner_org_id")
      .notNull()
      .references(() => partnerOrganizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("other"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(
      () => authUsers.id,
      { onDelete: "set null" },
    ),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("partner_tasks_org_idx").on(t.partnerOrgId),
    index("partner_tasks_status_idx").on(t.status),
    index("partner_tasks_due_idx").on(t.dueDate),
  ],
);

export const partnerComments = pgTable(
  "partner_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partnerOrgId: uuid("partner_org_id")
      .notNull()
      .references(() => partnerOrganizations.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorUserId: uuid("author_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("partner_comments_org_idx").on(t.partnerOrgId)],
);

export type PartnerOrganization = typeof partnerOrganizations.$inferSelect;
export type NewPartnerOrganization = typeof partnerOrganizations.$inferInsert;
export type PartnerTask = typeof partnerTasks.$inferSelect;
export type NewPartnerTask = typeof partnerTasks.$inferInsert;
export type PartnerComment = typeof partnerComments.$inferSelect;
export type NewPartnerComment = typeof partnerComments.$inferInsert;
