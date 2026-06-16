// Dicteren.ai — Offerte-creator (migratie 0041)
//
// Eén offerte per rij, gekoppeld aan een crm_organizations-lead. De prijs is een
// SNAPSHOT (line_items + net/vat/gross) op het moment van aanmaken, zodat een
// latere staffel-wijziging een al verstuurde offerte niet verandert. De
// rekenlogica zelf komt uit services/pricingTiers.ts (één waarheid); deze tabel
// bewaart alleen het resultaat + de offerte-metadata.

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";
import { crmOrganizations } from "./crmDeals";

export const crmOffertes = pgTable(
  "crm_offertes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    crmOrganizationId: uuid("crm_organization_id")
      .notNull()
      .references(() => crmOrganizations.id, { onDelete: "cascade" }),

    /** OFF-2026-0001 — jaar + oplopende teller. Uniek. */
    quoteNumber: text("quote_number").notNull(),
    /** concept | verzonden | geaccepteerd | afgewezen | verlopen */
    status: text("status").notNull().default("concept"),

    // Calculator-invoer (voor heropenen/dupliceren)
    seats: integer("seats").notNull().default(1),
    period: text("period").notNull().default("yearly"), // monthly | quarterly | yearly
    templateKey: text("template_key").notNull().default("merk"), // minimalist | klassiek | merk

    /** [{ description, qty, unitNetCents, netCents }] — netto regels, excl. btw. */
    lineItems: jsonb("line_items").notNull().default([]),

    // Prijs-snapshot (cents). gross = net + 21% btw (zie withVatCents).
    netCents: integer("net_cents").notNull().default(0),
    vatCents: integer("vat_cents").notNull().default(0),
    grossCents: integer("gross_cents").notNull().default(0),
    currency: text("currency").notNull().default("EUR"),

    validUntil: date("valid_until"),
    introText: text("intro_text"),
    closingText: text("closing_text"),
    notes: text("notes"),

    /** Gevuld zodra de PDF naar R2 is weggeschreven (bij status verzonden). */
    pdfR2Key: text("pdf_r2_key"),

    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("crm_offertes_quote_number_unique").on(t.quoteNumber),
    index("crm_offertes_org_idx").on(t.crmOrganizationId),
  ],
);

export type CrmOfferte = typeof crmOffertes.$inferSelect;
export type NewCrmOfferte = typeof crmOffertes.$inferInsert;
