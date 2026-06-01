import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pricingTiers, pricingSettings } from "@/lib/db/schema";
import {
  DEFAULT_PRICING,
  type PricingSnapshot,
  type SeatTier,
} from "./pricingTiers";

// Dicteren.ai — Server-side prijs-loader (DB → PricingSnapshot).
//
// Leest de editbare staffel + premies uit pricing_tiers + pricing_settings,
// met een korte in-memory cache en hardcoded fallback (DEFAULT_PRICING). De
// PURE rekenfuncties leven in pricingTiers.ts zodat client-componenten ze
// kunnen importeren zonder dit server-only bestand mee te slepen.

let cache: { snapshot: PricingSnapshot; at: number } | null = null;
const TTL_MS = 60_000;

/** Bepaal het korting-% van een staffel-rij t.o.v. de duurste (1-seat) prijs. */
function discountPct(pricePerSeatCents: number, baseCents: number): number {
  if (baseCents <= 0) return 0;
  return Math.round((1 - pricePerSeatCents / baseCents) * 100);
}

/**
 * Haal de actuele prijs-config op. Cached (60s) + fallback naar DEFAULT_PRICING
 * als de DB leeg/onbereikbaar is (bv. vóór migratie 0025 is gedraaid).
 */
export async function getPricing(force = false): Promise<PricingSnapshot> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    return cache.snapshot;
  }

  try {
    const [tierRows, settingsRows] = await Promise.all([
      db
        .select()
        .from(pricingTiers)
        .orderBy(asc(pricingTiers.sortOrder), asc(pricingTiers.minSeats)),
      db.select().from(pricingSettings).limit(1),
    ]);

    if (tierRows.length === 0) {
      cache = { snapshot: DEFAULT_PRICING, at: Date.now() };
      return DEFAULT_PRICING;
    }

    const baseCents = tierRows[0].pricePerSeatCents;
    const settings = settingsRows[0];

    const tiers: SeatTier[] = tierRows.map((t) => ({
      id: `tier_${t.minSeats}_${t.maxSeats ?? "plus"}`,
      min: t.minSeats,
      max: t.maxSeats,
      discountPct: discountPct(t.pricePerSeatCents, baseCents),
      pricePerSeatCents: t.pricePerSeatCents,
    }));

    const snapshot: PricingSnapshot = {
      tiers,
      quarterlyPremiumPct:
        settings?.quarterlyPremiumPct ?? DEFAULT_PRICING.quarterlyPremiumPct,
      monthlyPremiumPct:
        settings?.monthlyPremiumPct ?? DEFAULT_PRICING.monthlyPremiumPct,
      customQuoteFrom: settings?.customQuoteFrom ?? DEFAULT_PRICING.customQuoteFrom,
      currency: settings?.currency ?? "EUR",
    };

    cache = { snapshot, at: Date.now() };
    return snapshot;
  } catch {
    // DB niet bereikbaar of tabel bestaat nog niet → veilige defaults.
    return DEFAULT_PRICING;
  }
}

/** Forceer een verse load (na een admin-prijswijziging). */
export function invalidatePricingCache(): void {
  cache = null;
}
