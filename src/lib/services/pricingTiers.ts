// Dicteren.ai — Pricing-tier service
//
// Single source of truth voor zakelijke staffel-prijzen. De prijzen-pagina,
// checkout-routes, upgrade-flow en admin-MRR-berekening lezen allemaal hieruit.
//
// Bron: /prijzen pagina (LIVE production). Basis €120/seat/jaar, met staffels:
//   1-4   = 0%    €120/seat/jaar
//   5-9   = 10%   €108/seat/jaar
//   10-24 = 15%   €102/seat/jaar
//   25-49 = 20%   €96/seat/jaar
//   50+   = custom quote
//
// Wijzigingen hier raken alle downstream berekeningen. NIET inline duplicaten.

export const SEAT_BASE_PRICE_CENTS = 12_000; // €120/seat/jaar
export const CUSTOM_QUOTE_FROM = 50;

export type SeatTierId =
  | "tier_1_4"
  | "tier_5_9"
  | "tier_10_24"
  | "tier_25_49"
  | "tier_custom";

export type SeatTier = {
  id: SeatTierId;
  min: number;
  /** null = open einde (custom tier) */
  max: number | null;
  discountPct: number;
  pricePerSeatCents: number;
};

export const SEAT_TIERS: readonly SeatTier[] = [
  {
    id: "tier_1_4",
    min: 1,
    max: 4,
    discountPct: 0,
    pricePerSeatCents: 12_000,
  },
  {
    id: "tier_5_9",
    min: 5,
    max: 9,
    discountPct: 10,
    pricePerSeatCents: 10_800,
  },
  {
    id: "tier_10_24",
    min: 10,
    max: 24,
    discountPct: 15,
    pricePerSeatCents: 10_200,
  },
  {
    id: "tier_25_49",
    min: 25,
    max: 49,
    discountPct: 20,
    pricePerSeatCents: 9_600,
  },
] as const;

/** Custom-tier sentinel — boven CUSTOM_QUOTE_FROM. */
export const CUSTOM_TIER: SeatTier = {
  id: "tier_custom",
  min: CUSTOM_QUOTE_FROM,
  max: null,
  discountPct: 0,
  pricePerSeatCents: 0,
};

/** Pak de tier-rij voor een gegeven seat-aantal. Returnt 'custom' voor 50+. */
export function getTierForSeats(seats: number): SeatTier {
  if (seats >= CUSTOM_QUOTE_FROM) return CUSTOM_TIER;
  for (const tier of SEAT_TIERS) {
    if (seats >= tier.min && (tier.max === null || seats <= tier.max)) {
      return tier;
    }
  }
  return SEAT_TIERS[0];
}

/** Volgende tier-mijlpaal (voor "+ X seats voor 15% korting" nudges). */
export function nextTier(currentSeats: number): SeatTier | null {
  if (currentSeats >= CUSTOM_QUOTE_FROM) return null;
  for (const tier of SEAT_TIERS) {
    if (tier.min > currentSeats) return tier;
  }
  return null;
}

/** Totaal-prijs berekening op basis van staffel + periode. */
export function calculateTotalCents(args: {
  seats: number;
  period: "monthly" | "quarterly" | "yearly" | "lifetime";
}): {
  totalCents: number;
  tier: SeatTier;
  perSeatCents: number;
  /** True als de offerte-flow getriggerd moet worden. */
  customQuoteRequired: boolean;
} {
  const tier = getTierForSeats(args.seats);
  const customQuoteRequired = tier.id === "tier_custom";
  const perSeatCents = customQuoteRequired ? 0 : tier.pricePerSeatCents;

  // Conversie: yearly is de basis. Andere periods: maandelijks = /12 + 25% premium,
  // kwartaal = /4 + 17% premium. Maar voor zakelijk hanteren we ALLEEN yearly —
  // dat is wat de prijzen-pagina toont (en wat checkout/organization gebruikt).
  let totalCents = perSeatCents * args.seats;
  if (args.period === "monthly") totalCents = Math.round(totalCents / 12 * 1.25);
  if (args.period === "quarterly") totalCents = Math.round(totalCents / 4 * 1.08);
  if (args.period === "lifetime") totalCents = perSeatCents * args.seats * 4;

  return { totalCents, tier, perSeatCents, customQuoteRequired };
}

/** Pro-rata berekening voor seat-uitbreiding mid-cycle.
 *
 *  Twee delta-componenten:
 *    1. NIEUWE seats voor resterende dagen tegen NIEUW tarief.
 *    2. CORRECTIE op bestaande seats als de tier veranderde (kan negatief zijn
 *       = credit naar volgende incasso).
 *
 *  Returnt totaal in cents. Negatief = klant heeft credit tegoed.
 */
export function calculateProrationCents(args: {
  oldSeats: number;
  newSeats: number;
  daysRemaining: number;
  daysInPeriod: number;
}): {
  prorataDeltaCents: number;
  newSeatsCharge: number;
  tierCorrection: number;
  oldTier: SeatTier;
  newTier: SeatTier;
} {
  const oldTier = getTierForSeats(args.oldSeats);
  const newTier = getTierForSeats(args.newSeats);
  const ratio = args.daysRemaining / Math.max(1, args.daysInPeriod);
  const delta = args.newSeats - args.oldSeats;

  // Component 1: pro-rata charge voor nieuwe seats tegen het NIEUWE tarief.
  const newSeatsCharge = Math.round(
    newTier.pricePerSeatCents * Math.max(0, delta) * ratio,
  );

  // Component 2: correctie op de OUDE seats. Als nieuwe tier andere prijs heeft,
  // krijgt de klant credit (negatieve correctie) of bij-charge (positief).
  const perSeatDiff = newTier.pricePerSeatCents - oldTier.pricePerSeatCents;
  const tierCorrection = Math.round(perSeatDiff * args.oldSeats * ratio);

  return {
    prorataDeltaCents: newSeatsCharge + tierCorrection,
    newSeatsCharge,
    tierCorrection,
    oldTier,
    newTier,
  };
}

/** UI-helper: formatter voor de prijzen-pagina volume-strepen. */
export function tierLabel(tier: SeatTier): string {
  if (tier.id === "tier_custom") return "Maatwerk-offerte";
  if (tier.max === null) return `${tier.min}+ seats`;
  return `${tier.min}–${tier.max} seats`;
}
