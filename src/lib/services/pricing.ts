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

export type PricingSaveInput = {
  tiers: {
    minSeats: number;
    maxSeats: number | null;
    pricePerSeatCents: number;
  }[];
  quarterlyPremiumPct: number;
  monthlyPremiumPct: number;
  customQuoteFrom: number;
  currency?: string;
};

/** Valideer een prijs-input. Returnt een foutmelding of null. */
export function validatePricingInput(input: PricingSaveInput): string | null {
  if (!input.tiers.length) return "Minstens één staffel-rij vereist.";
  const sorted = [...input.tiers].sort((a, b) => a.minSeats - b.minSeats);
  if (sorted[0].minSeats !== 1) return "De eerste staffel moet bij 1 seat beginnen.";
  let prevMax = 0;
  for (const t of sorted) {
    if (t.pricePerSeatCents <= 0) return "Prijs per seat moet groter dan 0 zijn.";
    // Aaneengesloten: elke band moet exact bij prevMax+1 beginnen. Vangt zowel
    // overlap (min ≤ prevMax) als gaten (min > prevMax+1) af — anders valt een
    // seat-aantal in een verkeerde of geen staffel.
    if (t.minSeats !== prevMax + 1) {
      return prevMax === 0
        ? "De eerste staffel moet bij 1 seat beginnen."
        : `Staffels moeten aaneengesloten zijn — er ontbreekt of overlapt een band rond ${prevMax} seats.`;
    }
    if (t.maxSeats !== null && t.maxSeats < t.minSeats) {
      return "Boven-grens mag niet onder de onder-grens liggen.";
    }
    prevMax = t.maxSeats ?? Number.MAX_SAFE_INTEGER;
  }
  if (input.quarterlyPremiumPct < 0 || input.quarterlyPremiumPct > 500) {
    return "Kwartaal-premie buiten bereik (0–500%).";
  }
  if (input.monthlyPremiumPct < 0 || input.monthlyPremiumPct > 500) {
    return "Maand-premie buiten bereik (0–500%).";
  }
  const topMax = sorted[sorted.length - 1].maxSeats;
  if (topMax !== null && input.customQuoteFrom <= topMax) {
    return "Maatwerk-drempel moet boven de hoogste staffel liggen.";
  }
  return null;
}

/**
 * Vervang de volledige prijs-config (staffel + settings). De tier-tabel wordt
 * leeggemaakt en opnieuw gevuld; mocht het insert falen na de delete, dan valt
 * `getPricing()` terug op DEFAULT_PRICING (= de seed) — dus geen kapotte staat.
 * Singleton settings via upsert op id=1.
 */
export async function savePricing(input: PricingSaveInput): Promise<void> {
  await db
    .insert(pricingSettings)
    .values({
      id: 1,
      quarterlyPremiumPct: input.quarterlyPremiumPct,
      monthlyPremiumPct: input.monthlyPremiumPct,
      customQuoteFrom: input.customQuoteFrom,
      currency: input.currency ?? "EUR",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pricingSettings.id,
      set: {
        quarterlyPremiumPct: input.quarterlyPremiumPct,
        monthlyPremiumPct: input.monthlyPremiumPct,
        customQuoteFrom: input.customQuoteFrom,
        currency: input.currency ?? "EUR",
        updatedAt: new Date(),
      },
    });

  const sorted = [...input.tiers].sort((a, b) => a.minSeats - b.minSeats);
  await db.delete(pricingTiers);
  await db.insert(pricingTiers).values(
    sorted.map((t, i) => ({
      minSeats: t.minSeats,
      maxSeats: t.maxSeats,
      pricePerSeatCents: t.pricePerSeatCents,
      sortOrder: i,
    })),
  );

  invalidatePricingCache();
}
