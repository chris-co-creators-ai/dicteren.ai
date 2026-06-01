import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Dicteren.ai — Editbare prijs-SSOT (zakelijke staffel + periode-premies).
//
// Voor 2026-06 stond de zakelijke staffel hardcoded in services/pricingTiers.ts.
// Nu leeft de prijs in de DB zodat admin (en per-klant de AM) hem kan bewerken
// zonder deploy. De service leest deze tabellen met cache + hardcoded fallback.
//
// Consumer-prijzen blijven in de `plans`-tabel (één prijs per plan). Deze
// tabellen gelden alleen voor de zakelijke per-seat staffel + de premie-opslag
// op kwartaal/maand.

/** Zakelijke staffel: prijs per seat per JAAR, per seat-bandbreedte.
 *  De premie voor kwartaal/maand komt uit `pricing_settings`. */
export const pricingTiers = pgTable("pricing_tiers", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Onderste seat-grens van de band (inclusief). */
  minSeats: integer("min_seats").notNull(),
  /** Bovenste seat-grens (inclusief). null = open einde (zou custom worden). */
  maxSeats: integer("max_seats"),
  /** Prijs per seat per jaar in cents. */
  pricePerSeatCents: integer("price_per_seat_cents").notNull(),
  /** Sorteervolgorde in de admin-editor. */
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Singleton-rij met de periode-premies + custom-quote drempel.
 *  Premie als heel percentage: 25 = +25% bovenop (jaar/4), 50 = +50% (jaar/12). */
export const pricingSettings = pgTable(
  "pricing_settings",
  {
    id: integer("id").primaryKey().default(1),
    /** +% bovenop (jaarprijs / 4) voor een kwartaaltermijn. */
    quarterlyPremiumPct: integer("quarterly_premium_pct").notNull().default(25),
    /** +% bovenop (jaarprijs / 12) voor een maandtermijn. */
    monthlyPremiumPct: integer("monthly_premium_pct").notNull().default(50),
    /** Vanaf dit aantal seats → maatwerk-offerte i.p.v. zelf-checkout. */
    customQuoteFrom: integer("custom_quote_from").notNull().default(50),
    currency: text("currency").notNull().default("EUR"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("pricing_settings_singleton", sql`${t.id} = 1`)],
);
