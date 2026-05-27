// Unit-tests voor services/affiliateRules + slug-validation.
//
// Draaien:
//   cd web && bun scripts/test-affiliate-rules.ts

import {
  LOCKUP_DAYS,
  PAYOUT_DAY_OF_MONTH,
  calculateProrationCents,
  calculateRuleCommissionCents,
  calculateUnlocksAt,
  customerTypeFromPlanType,
  monthsSince,
  pickCommissionRule,
} from "../src/lib/services/affiliateRules";
import {
  RESERVED_SLUGS,
  suggestSlugFromName,
  validateSlugFormat,
} from "../src/lib/services/affiliateSlug";
import type { Affiliate } from "../src/lib/db/schema";

let passed = 0;
let failed = 0;

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

void calculateProrationCents; // unused

console.log("\n=== LOCKUP_DAYS + PAYOUT_DAY ===");
assert("LOCKUP_DAYS = 30", LOCKUP_DAYS, 30);
assert("PAYOUT_DAY_OF_MONTH = 25", PAYOUT_DAY_OF_MONTH, 25);

console.log("\n=== calculateUnlocksAt ===");
const paidAt = new Date("2026-05-01T10:00:00Z");
const unlocks = calculateUnlocksAt(paidAt);
assert("paidAt + 30d", unlocks.toISOString(), "2026-05-31T10:00:00.000Z");

console.log("\n=== monthsSince ===");
const ref = new Date("2026-01-15T12:00:00Z");
assert("zelfde dag = 0 maanden", monthsSince(ref, new Date("2026-01-15T13:00:00Z")), 0);
assert("1 mnd later", monthsSince(ref, new Date("2026-02-15T12:00:00Z")), 1);
assert("3 mnd later", monthsSince(ref, new Date("2026-04-15T12:00:00Z")), 3);
assert("1 jaar later", monthsSince(ref, new Date("2027-01-15T12:00:00Z")), 12);
assert("3 mnd minus 1 dag", monthsSince(ref, new Date("2026-04-14T12:00:00Z")), 2);

console.log("\n=== customerTypeFromPlanType ===");
assert("consumer plan", customerTypeFromPlanType("consumer"), "consumer");
assert("organization plan", customerTypeFromPlanType("organization"), "business");

console.log("\n=== pickCommissionRule ===");
const baseAff = {
  id: "test",
  status: "active",
  consumerCommissionType: "percentage",
  consumerCommissionPct: 20,
  consumerCommissionFixedCents: 0,
  consumerCommissionDurationMonths: 12,
  consumerRecurringCommissionPct: 10,
  consumerRecurringCommissionFixedCents: 0,
  businessCommissionType: "percentage",
  businessCommissionPct: 15,
  businessCommissionFixedCents: 0,
  businessCommissionDurationMonths: 24,
  businessRecurringCommissionPct: 5,
  businessRecurringCommissionFixedCents: 0,
} as unknown as Affiliate;

const firstConsumer = pickCommissionRule({
  affiliate: baseAff,
  customerType: "consumer",
  isRenewal: false,
});
assert("first consumer = 20%", firstConsumer?.commissionPct, 20);
assert("first consumer not renewal", firstConsumer?.isRenewal, false);

const renewConsumer = pickCommissionRule({
  affiliate: baseAff,
  customerType: "consumer",
  isRenewal: true,
  monthsSinceFirstSeen: 6,
});
assert("renew consumer = 10%", renewConsumer?.commissionPct, 10);
assert("renew within duration", renewConsumer?.isRenewal, true);

const renewExpired = pickCommissionRule({
  affiliate: baseAff,
  customerType: "consumer",
  isRenewal: true,
  monthsSinceFirstSeen: 13,
});
assert("renew after duration = null", renewExpired, null);

const firstBiz = pickCommissionRule({
  affiliate: baseAff,
  customerType: "business",
  isRenewal: false,
});
assert("first business = 15%", firstBiz?.commissionPct, 15);

const renewBizWithin = pickCommissionRule({
  affiliate: baseAff,
  customerType: "business",
  isRenewal: true,
  monthsSinceFirstSeen: 20,
});
assert("renew business within 24m = 5%", renewBizWithin?.commissionPct, 5);

const noConsumerAff = {
  ...baseAff,
  consumerCommissionType: null,
} as unknown as Affiliate;
const offRule = pickCommissionRule({
  affiliate: noConsumerAff,
  customerType: "consumer",
  isRenewal: false,
});
assert("uitstaande consumer = null", offRule, null);

console.log("\n=== calculateRuleCommissionCents ===");
const percRule = {
  enabled: true,
  type: "percentage" as const,
  commissionPct: 20,
  commissionFixedCents: 0,
  durationMonths: 12,
  isRenewal: false,
};
assert(
  "20% van €100 = €20",
  calculateRuleCommissionCents({ rule: percRule, basisAmountCents: 10_000, seats: 1 }),
  2_000,
);

const fixedRule = {
  enabled: true,
  type: "fixed_per_seat" as const,
  commissionPct: 0,
  commissionFixedCents: 500,
  durationMonths: 12,
  isRenewal: false,
};
assert(
  "€5 × 10 seats = €50",
  calculateRuleCommissionCents({ rule: fixedRule, basisAmountCents: 0, seats: 10 }),
  5_000,
);

console.log("\n=== Slug-validatie ===");
const ok1 = validateSlugFormat("jan-de-vries");
assert("valid slug", ok1.ok, true);

const ok2 = validateSlugFormat("acme-2026");
assert("met cijfer = ok", ok2.ok, true);

const ok3 = validateSlugFormat("jan");
assert("3 chars minimum", ok3.ok, true);

const bad1 = validateSlugFormat("ab");
assert("2 chars te kort", bad1.ok, false);

const bad2 = validateSlugFormat("admin");
assert("admin reserved", bad2.ok, false);

const bad3 = validateSlugFormat("Capital-Letters");
assert("hoofdletters auto-genormaliseerd", bad3.ok && bad3.slug === "capital-letters", true);

const bad4 = validateSlugFormat("-leading-dash");
assert("leading dash niet ok", bad4.ok, false);

const bad5 = validateSlugFormat("trailing-");
assert("trailing dash niet ok", bad5.ok, false);

const bad6 = validateSlugFormat("api");
assert("api reserved", bad6.ok, false);

const bad7 = validateSlugFormat("prijzen");
assert("prijzen reserved", bad7.ok, false);

const tooLong = validateSlugFormat("a".repeat(41));
assert("41 chars te lang", tooLong.ok, false);

assert("RESERVED_SLUGS heeft >20 items", RESERVED_SLUGS.size > 20, true);
assert("zakelijk reserved", RESERVED_SLUGS.has("zakelijk"), true);
assert("ai-model reserved", RESERVED_SLUGS.has("ai-model"), true);

console.log("\n=== suggestSlugFromName ===");
const sug = suggestSlugFromName("Jan de Vries");
assert("eerste suggestie", sug[0], "jan-de-vries");
assert("≥1 suggestie", sug.length >= 1, true);

const sugDiacritics = suggestSlugFromName("André Müller");
assert("diacritics genormaliseerd", sugDiacritics[0]?.includes("andre"), true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
