// Dicteren.ai — Campagne-stappen (cadence-template per lijst)
//
// De account-manager bouwt per lead-lijst een eigen reeks stappen: een keten
// van geplande acties (call/email/linkedin/meeting/note). Geen vaste automaat,
// geen outcome-branching — de AM bepaalt de volgorde, de timing en of een stap
// verplicht is.
//
// Timing is relatief: elke stap valt delay_days dagen na de vorige stap. Bij
// "Toepassen" rolt de keten uit als crm_org_tasks per lijst-lid (cumulatieve
// dueAt) — het bestaande taken-systeem, geen aparte activity-tabel.
//
// type-waarden komen uit de SSOT config/crmActivity.ts (ActivityType).

import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { leadLists } from "./crm";

// Eigen enum voor het staptype (call/email/linkedin/meeting/note). Spiegelt de
// ActivityType-vocabulary uit config/crmActivity.ts.
export const crmStepType = pgEnum("crm_step_type", [
  "call",
  "email",
  "linkedin",
  "meeting",
  "note",
]);

export const crmCampaignSteps = pgTable(
  "crm_campaign_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    listId: uuid("list_id")
      .notNull()
      .references(() => leadLists.id, { onDelete: "cascade" }),

    // 0-based volgorde binnen de lijst.
    position: integer("position").notNull(),

    type: crmStepType("type").notNull(),

    // Dagen na de vorige stap (relatief).
    delayDays: integer("delay_days").notNull().default(0),

    required: boolean("required").notNull().default(true),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("crm_campaign_steps_list_position_idx").on(t.listId, t.position),
  ],
);

export type CrmCampaignStep = typeof crmCampaignSteps.$inferSelect;
export type NewCrmCampaignStep = typeof crmCampaignSteps.$inferInsert;
