import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { authUsers, authOrganizations } from "./auth-bridge";
import { licenses } from "./licensing";

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

export type EventRow = typeof events.$inferSelect;
