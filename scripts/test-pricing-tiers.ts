// Unit-tests voor services/pricingTiers — verifieert dat de staffel-prijzen
// uit /prijzen op de pagina, in de checkout, en in de upgrade-flow allemaal
// hetzelfde berekenen. Draaien met:
//
//   cd web && bun scripts/test-pricing-tiers.ts

import {
  CUSTOM_QUOTE_FROM,
  SEAT_TIERS,
  calculateProrationCents,
  calculateTotalCents,
  getTierForSeats,
  nextTier,
  tierLabel,
} from "../src/lib/services/pricingTiers";

let failed = 0;
let passed = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(
      `  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`,
    );
  }
}

console.log("\n=== Test: getTierForSeats() ===");
assert("1 seat → tier_1_4 (0%)", getTierForSeats(1).id, "tier_1_4");
assert("4 seats → tier_1_4 boundary", getTierForSeats(4).id, "tier_1_4");
assert("5 seats → tier_5_9 (10%)", getTierForSeats(5).id, "tier_5_9");
assert("9 seats → tier_5_9 boundary", getTierForSeats(9).id, "tier_5_9");
assert("10 seats → tier_10_24 (15%)", getTierForSeats(10).id, "tier_10_24");
assert("24 seats → tier_10_24 boundary", getTierForSeats(24).id, "tier_10_24");
assert("25 seats → tier_25_49 (20%)", getTierForSeats(25).id, "tier_25_49");
assert("49 seats → tier_25_49 boundary", getTierForSeats(49).id, "tier_25_49");
assert("50 seats → tier_custom", getTierForSeats(50).id, "tier_custom");
assert("100 seats → tier_custom", getTierForSeats(100).id, "tier_custom");

console.log("\n=== Test: tier-prijzen klopen met /prijzen pagina ===");
// /prijzen pagina toont:
//   1-4:   €120
//   5-9:   €108 (10%)
//   10-24: €102 (15%)
//   25-49: €96 (20%)
assert("tier_1_4 prijs = €120 (12000c)", getTierForSeats(1).pricePerSeatCents, 12_000);
assert("tier_5_9 prijs = €108 (10800c)", getTierForSeats(5).pricePerSeatCents, 10_800);
assert("tier_10_24 prijs = €102 (10200c)", getTierForSeats(10).pricePerSeatCents, 10_200);
assert("tier_25_49 prijs = €96 (9600c)", getTierForSeats(25).pricePerSeatCents, 9_600);

console.log("\n=== Test: nextTier() voor upgrade-nudge ===");
assert("nextTier(3) → tier_5_9 op seat 5", nextTier(3)?.min, 5);
assert("nextTier(4) → tier_5_9 op seat 5", nextTier(4)?.min, 5);
assert("nextTier(8) → tier_10_24 op seat 10", nextTier(8)?.min, 10);
assert("nextTier(20) → tier_25_49 op seat 25", nextTier(20)?.min, 25);
assert("nextTier(49) → null (custom volgt)", nextTier(49), null);
assert("nextTier(50) → null (al custom)", nextTier(50), null);

console.log("\n=== Test: calculateTotalCents() yearly ===");
const t1 = calculateTotalCents({ seats: 3, period: "yearly" });
assert("3 seats × €120 = €360", t1.totalCents, 36_000);
assert("3 seats tier = tier_1_4", t1.tier.id, "tier_1_4");

const t5 = calculateTotalCents({ seats: 5, period: "yearly" });
assert("5 seats × €108 = €540 (10% korting)", t5.totalCents, 54_000);

const t10 = calculateTotalCents({ seats: 10, period: "yearly" });
assert("10 seats × €102 = €1.020 (15% korting)", t10.totalCents, 102_000);

const t25 = calculateTotalCents({ seats: 25, period: "yearly" });
assert("25 seats × €96 = €2.400 (20% korting)", t25.totalCents, 240_000);

const tCustom = calculateTotalCents({ seats: 60, period: "yearly" });
assert("60 seats → customQuoteRequired", tCustom.customQuoteRequired, true);
assert("60 seats totaal = 0 (offerte)", tCustom.totalCents, 0);

console.log("\n=== Test: calculateProrationCents() ===");
// 5→8 seats, midden in jaar (182 dagen resterend van 365)
const halfYear = calculateProrationCents({
  oldSeats: 5,
  newSeats: 8,
  daysRemaining: 182,
  daysInPeriod: 365,
});
// 3 nieuwe seats × €108 × (182/365) = 3 × 108 × 0.4986 ≈ €161.55 → 16155c
const expectedNewCharge = Math.round(10_800 * 3 * (182 / 365));
assert("3 nieuwe seats binnen tier_5_9 charge", halfYear.newSeatsCharge, expectedNewCharge);
assert("Tier blijft hetzelfde → 0 correctie", halfYear.tierCorrection, 0);
assert("Pro-rata delta = nieuwe charge", halfYear.prorataDeltaCents, expectedNewCharge);

// 4→5 cross-tier (tier_1_4 → tier_5_9). Halverwege.
const crossTier = calculateProrationCents({
  oldSeats: 4,
  newSeats: 5,
  daysRemaining: 182,
  daysInPeriod: 365,
});
// Nieuwe seat: 1 × €108 × 0.4986 ≈ €53.85
const newSeatCharge = Math.round(10_800 * 1 * (182 / 365));
// Tier-correctie op de 4 oude: van €120 → €108 = -€12 × 4 × 0.4986 ≈ -€23.93
const correction = Math.round((10_800 - 12_000) * 4 * (182 / 365));
assert("Cross-tier 4→5 nieuwe seat charge", crossTier.newSeatsCharge, newSeatCharge);
assert("Cross-tier 4→5 negatieve correctie op oude seats", crossTier.tierCorrection, correction);
assert("Cross-tier delta = sum", crossTier.prorataDeltaCents, newSeatCharge + correction);

// 10→8 downgrade — geen instant charge (delta=0 voor newSeats < oldSeats)
const down = calculateProrationCents({
  oldSeats: 10,
  newSeats: 8,
  daysRemaining: 100,
  daysInPeriod: 365,
});
assert("Downgrade newSeats charge = 0", down.newSeatsCharge, 0);

console.log("\n=== Test: CUSTOM_QUOTE_FROM constant ===");
assert("CUSTOM_QUOTE_FROM = 50", CUSTOM_QUOTE_FROM, 50);
assert("4 tiers + 1 custom = 5", SEAT_TIERS.length, 4);

console.log("\n=== Test: tierLabel() ===");
assert("tier_1_4 label", tierLabel(SEAT_TIERS[0]), "1–4 seats");
assert("tier_5_9 label", tierLabel(SEAT_TIERS[1]), "5–9 seats");
assert("tier_10_24 label", tierLabel(SEAT_TIERS[2]), "10–24 seats");
assert("tier_25_49 label", tierLabel(SEAT_TIERS[3]), "25–49 seats");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
