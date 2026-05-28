// Dicteren.ai — B2B sales pipeline schema
//
// Drie tabellen voor de account-manager-initiated route (Route C) en de
// koppeling van consumer-upgrades + self-service B2B-klanten:
//   - crm_organizations: lead/prospect-orgs vóór ze auth.organization worden
//   - crm_contacts: losse personen die nog geen auth.user zijn
//   - crm_events: chronologische timeline per organisatie
//   - crm_org_tasks: taken per organisatie (zelfde patroon als partner_tasks)
//
// Bij Mollie-paid wordt auth_organization_id ingevuld zodra de echte
// Better-Auth-organization is aangemaakt. Geen mock-orgs in auth.organization.

import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  smallint,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { authUsers, authOrganizations } from "./auth-bridge";
import { customerTemperature } from "./crm";

export const crmOrgStatus = pgEnum("crm_org_status", [
  "lead",           // net aangemaakt, nog geen contact
  "contacted",      // AM heeft gebeld/gemaild
  "qualified",      // klant past, budget en seats bekend
  "proposal_sent",  // Mollie-betaal-link verstuurd
  "negotiating",    // klant heeft vragen, deal in beweging
  "won",            // eerste betaling binnen
  "lost",           // klant haakt af
]);

export const crmOrgSource = pgEnum("crm_org_source", [
  "am_outreach",       // account manager startte de deal
  "self_service",      // klant via /zakelijk/start
  "consumer_upgrade",  // bestaande consumer-user is opgewaardeerd
  "csv_import",        // bulk import
  "lead_form",         // /contact, /word-partner, /zakelijk-quote
]);

export const crmEventKind = pgEnum("crm_event_kind", [
  "created",
  "status_changed",
  "field_updated",
  "contact_added",
  "contact_removed",
  "email_sent",
  "email_opened",
  "email_clicked",
  "email_bounced",
  "payment_link_generated",
  "payment_link_sent",
  "payment_link_resent",
  "payment_received",
  "marked_paid_offline",
  "auth_org_created",
  "consumer_sub_canceled",
  "note_added",
  "task_added",
  "task_completed",
]);

export const crmOrganizations = pgTable(
  "crm_organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Bedrijfsgegevens
    name: text("name").notNull(),
    kvk: text("kvk"),
    vatNumber: text("vat_number"),
    website: text("website"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    postalCode: text("postal_code"),
    city: text("city"),
    countryCode: text("country_code").default("NL"),

    // CRM-metadata
    source: crmOrgSource("source").notNull().default("am_outreach"),
    status: crmOrgStatus("status").notNull().default("lead"),
    temperature: customerTemperature("temperature"),
    accountOwnerId: uuid("account_owner_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    nextAction: text("next_action"),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),

    // Deal-data (wat we de klant aanbieden)
    proposedSeats: integer("proposed_seats"),
    proposedAmountCents: integer("proposed_amount_cents"),
    proposedPlanSlug: text("proposed_plan_slug"),
    discountCode: text("discount_code"),

    // Mollie + Better-Auth koppeling
    authOrganizationId: uuid("auth_organization_id").references(
      () => authOrganizations.id,
      { onDelete: "set null" },
    ),
    mollieCustomerId: text("mollie_customer_id"),
    paymentLinkOrderId: uuid("payment_link_order_id"),
    paymentLinkUrl: text("payment_link_url"),
    paymentLinkSentAt: timestamp("payment_link_sent_at", {
      withTimezone: true,
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    lostReason: text("lost_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crm_organizations_status_idx").on(t.status),
    index("crm_organizations_owner_idx").on(t.accountOwnerId),
    index("crm_organizations_auth_org_idx").on(t.authOrganizationId),
    index("crm_organizations_source_idx").on(t.source),
  ],
);

export const crmContacts = pgTable(
  "crm_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    crmOrganizationId: uuid("crm_organization_id").references(
      () => crmOrganizations.id,
      { onDelete: "cascade" },
    ),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    roleAtCompany: text("role_at_company"),
    isPrimary: boolean("is_primary").notNull().default(false),
    authUserId: uuid("auth_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crm_contacts_org_idx").on(t.crmOrganizationId),
    index("crm_contacts_email_idx").on(t.email),
    index("crm_contacts_auth_user_idx").on(t.authUserId),
  ],
);

export const crmEvents = pgTable(
  "crm_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    crmOrganizationId: uuid("crm_organization_id").references(
      () => crmOrganizations.id,
      { onDelete: "cascade" },
    ),
    crmContactId: uuid("crm_contact_id").references(() => crmContacts.id, {
      onDelete: "set null",
    }),
    actorUserId: uuid("actor_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    kind: crmEventKind("kind").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crm_events_org_idx").on(t.crmOrganizationId),
    index("crm_events_created_idx").on(t.createdAt),
    index("crm_events_kind_idx").on(t.kind),
  ],
);

export const crmOrgTasks = pgTable(
  "crm_org_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    crmOrganizationId: uuid("crm_organization_id")
      .notNull()
      .references(() => crmOrganizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("other"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crm_org_tasks_org_idx").on(t.crmOrganizationId),
    index("crm_org_tasks_completed_idx").on(t.completedAt),
  ],
);

// Enrichment-laag (Clay-stijl) — append-only facts per (entity × field × provider).
// Zie migratie 0020. Resolver-service kiest winnende waarde via
// ORDER BY confidence DESC, verified_at DESC LIMIT 1.
export const crmEnrichmentFacts = pgTable(
  "crm_enrichment_facts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id").references(() => crmContacts.id, {
      onDelete: "cascade",
    }),
    organizationId: uuid("organization_id").references(
      () => crmOrganizations.id,
      { onDelete: "cascade" },
    ),
    fieldKey: text("field_key").notNull(),
    value: text("value").notNull(),
    provider: text("provider").notNull(),
    confidence: smallint("confidence").notNull(),
    sourceUrl: text("source_url"),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crm_enrichment_facts_contact_field_idx").on(
      t.contactId,
      t.fieldKey,
    ),
    index("crm_enrichment_facts_org_field_idx").on(
      t.organizationId,
      t.fieldKey,
    ),
    index("crm_enrichment_facts_resolver_idx").on(
      t.fieldKey,
      t.confidence,
      t.verifiedAt,
    ),
  ],
);

// Signal-laag — trigger-events die routeNewSignals omzet in een crm_org_task.
export const crmSignals = pgTable(
  "crm_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id").references(() => crmContacts.id, {
      onDelete: "cascade",
    }),
    organizationId: uuid("organization_id").references(
      () => crmOrganizations.id,
      { onDelete: "cascade" },
    ),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    score: smallint("score").notNull(),
    status: text("status").notNull().default("new"),
    actionedTaskId: uuid("actioned_task_id").references(() => crmOrgTasks.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crm_signals_routing_idx").on(t.status, t.score),
    index("crm_signals_org_status_idx").on(t.organizationId, t.status),
    index("crm_signals_contact_status_idx").on(t.contactId, t.status),
  ],
);

export type CrmOrganization = typeof crmOrganizations.$inferSelect;
export type NewCrmOrganization = typeof crmOrganizations.$inferInsert;
export type CrmContact = typeof crmContacts.$inferSelect;
export type NewCrmContact = typeof crmContacts.$inferInsert;
export type CrmEvent = typeof crmEvents.$inferSelect;
export type NewCrmEvent = typeof crmEvents.$inferInsert;
export type CrmOrgTask = typeof crmOrgTasks.$inferSelect;
export type NewCrmOrgTask = typeof crmOrgTasks.$inferInsert;
export type CrmEnrichmentFact = typeof crmEnrichmentFacts.$inferSelect;
export type NewCrmEnrichmentFact = typeof crmEnrichmentFacts.$inferInsert;
export type CrmSignal = typeof crmSignals.$inferSelect;
export type NewCrmSignal = typeof crmSignals.$inferInsert;
