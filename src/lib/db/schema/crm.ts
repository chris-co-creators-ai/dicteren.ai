import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";

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

/** Per-user CRM-attributen naast auth.user. Lazy: rij wordt pas
 *  aangemaakt bij eerste edit. */
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

export const crmCustomColumns = pgTable(
  "crm_custom_columns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
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

export type CustomerAttributes = typeof customerAttributes.$inferSelect;
export type NewCustomerAttributes = typeof customerAttributes.$inferInsert;
export type LeadList = typeof leadLists.$inferSelect;
export type NewLeadList = typeof leadLists.$inferInsert;
export type LeadListMember = typeof leadListMembers.$inferSelect;
export type NewLeadListMember = typeof leadListMembers.$inferInsert;
export type CrmColumnPrefs = typeof crmColumnPrefs.$inferSelect;
export type CrmCustomColumn = typeof crmCustomColumns.$inferSelect;
export type NewCrmCustomColumn = typeof crmCustomColumns.$inferInsert;
