// Live integratie-test van affiliate-systeem tegen productie-DB.
// Cleanup at the end. Vereist .env.local.
//
// Draaien:
//   cd web && bun --conditions=react-server scripts/test-affiliate-live.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  affiliateCommissions,
  affiliatePayouts,
  affiliateReferrals,
  affiliates,
  orders,
} from "../src/lib/db/schema";
import { authUser } from "../src/lib/db/auth-schema";
import { dbAuth } from "../src/lib/db";
import {
  createAffiliate,
  recordCommissionV2,
  voidCommissionsForOrder,
  customerTypeFromOrderPlan,
} from "../src/lib/services/affiliate";
import {
  getAffiliateBySlug,
  validateSlugAvailable,
} from "../src/lib/services/affiliateSlug";
import {
  LOCKUP_DAYS,
  calculateUnlocksAt,
} from "../src/lib/services/affiliateRules";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

console.log("\n=== Setup test-affiliate ===");
const testSlug = `test-aff-${Date.now()}`;
const testEmail = `test-${Date.now()}@example.com`;

const validation = await validateSlugAvailable(testSlug);
assert("slug is beschikbaar", validation.ok);

const affiliate = await createAffiliate({
  name: "Test Affiliate (auto-cleanup)",
  contactEmail: testEmail,
  commissionType: "percentage",
  commissionPct: 0,
});
console.log(`  → created affiliate: ${affiliate.id}`);

// Update affiliate met slug + commissie-config
const [updated] = await db
  .update(affiliates)
  .set({
    slug: testSlug,
    displayName: "Jan de Vries Test",
    consumerCommissionType: "percentage",
    consumerCommissionPct: 20,
    consumerCommissionDurationMonths: 12,
    consumerRecurringCommissionPct: 10,
    businessCommissionType: "percentage",
    businessCommissionPct: 15,
    businessCommissionDurationMonths: 24,
    businessRecurringCommissionPct: 5,
    minimumPayoutCents: 2500,
    updatedAt: new Date(),
  })
  .where(eq(affiliates.id, affiliate.id))
  .returning();

assert("slug gezet", updated.slug === testSlug);
assert("consumer 20%", updated.consumerCommissionPct === 20);
assert("business 15%", updated.businessCommissionPct === 15);

try {
  console.log("\n=== getAffiliateBySlug ===");
  const found = await getAffiliateBySlug(testSlug);
  assert("vindbaar via slug", found?.id === affiliate.id);

  const notFound = await getAffiliateBySlug("does-not-exist-xyz-123");
  assert("non-existing slug = null", notFound === null);

  console.log("\n=== Slug-collision check ===");
  const dup = await validateSlugAvailable(testSlug);
  assert("eigen slug door anderen genomen = false", !dup.ok);

  const dupExcludeSelf = await validateSlugAvailable(testSlug, affiliate.id);
  assert("eigen slug exclude-self = true", dupExcludeSelf.ok);

  console.log("\n=== recordCommissionV2 dry-run (geen echte order) ===");
  // Mock een referral + order-context voor de service. Maar we hebben geen
  // echte order/user — die zou refereren naar bestaande FKs. Test-skip:
  // we testen alleen dat de functie geen errors gooit bij valid input.
  console.log("  (skipped — vereist echte order voor FK-integriteit)");

  console.log("\n=== Lockup-calculation ===");
  const paidAt = new Date("2026-05-01T10:00:00Z");
  const unlocks = calculateUnlocksAt(paidAt);
  const diffDays = (unlocks.getTime() - paidAt.getTime()) / 86_400_000;
  assert("paidAt + LOCKUP_DAYS dagen", diffDays === LOCKUP_DAYS);

  console.log("\n=== customerTypeFromOrderPlan ===");
  assert(
    "consumer plan -> consumer",
    customerTypeFromOrderPlan("consumer") === "consumer",
  );
  assert(
    "organization plan -> business",
    customerTypeFromOrderPlan("organization") === "business",
  );

  console.log("\n=== voidCommissionsForOrder voor niet-bestaande order ===");
  const voidResult = await voidCommissionsForOrder({
    orderId: "00000000-0000-0000-0000-000000000000",
    reason: "refund",
  });
  assert(
    "geen commissions = 0 voided",
    voidResult.voidedCount === 0,
  );
} finally {
  // Cleanup test-affiliate (cascade-deletes referrals/commissions/payouts)
  console.log("\n  → cleanup test-affiliate");
  await db.delete(affiliates).where(eq(affiliates.id, affiliate.id));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

// Voorkom unused-warnings voor imports we niet allemaal hier raken
void affiliateCommissions;
void affiliatePayouts;
void affiliateReferrals;
void authUser;
void orders;
void dbAuth;
void recordCommissionV2;
