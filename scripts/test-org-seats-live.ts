// Live integratie-test van orgSeats services tegen productie-DB.
// Vereist .env.local met DATABASE_URL ingeladen.
//
// Test scope (READ-ONLY):
//   - getOrgSeatSnapshot voor een non-bestaande org → 0/0 snapshot
//   - listOrgSeats / listOrgDevices / findUnassignedSeat shapes
//   - createUnassignedSeats + revokeSeat met cleanup via SQL (admin-org)
//
// Draaien:
//   cd web && bun --conditions=react-server scripts/test-org-seats-live.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  getOrgSeatSnapshot,
  listOrgSeats,
  listOrgDevices,
  findUnassignedSeat,
  createUnassignedSeats,
  revokeSeat,
} from "../src/lib/services/orgSeats";
import { getTierForSeats } from "../src/lib/services/pricingTiers";
import { db, dbAuth } from "../src/lib/db";
import { authOrg } from "../src/lib/db/auth-schema";
import { licenses } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

let failed = 0;
let passed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

const FAKE_ORG_ID = "00000000-0000-0000-0000-000000000000";
const ADMIN_USER_ID = "27a4ea0a-ad8e-4240-8116-3d3a84de3a9d";

console.log("\n=== Test: getOrgSeatSnapshot voor non-bestaande org ===");
const emptySnap = await getOrgSeatSnapshot(FAKE_ORG_ID);
assert("0 seats", emptySnap.totalSeats === 0);
assert("0 assigned", emptySnap.assignedSeats === 0);
assert("0 pending", emptySnap.pendingSeats === 0);
assert("0 devices", emptySnap.activeDevicesTotal === 0);
assert("currentTier = tier_1_4", emptySnap.currentTier.id === "tier_1_4");
assert("perSeatPriceCents = 12000", emptySnap.perSeatPriceCents === 12_000);
assert("subscription = null", emptySnap.subscription === null);

console.log("\n=== Test: listOrgSeats voor non-bestaande org ===");
const noSeats = await listOrgSeats(FAKE_ORG_ID);
assert("returns empty array", Array.isArray(noSeats) && noSeats.length === 0);

console.log("\n=== Test: listOrgDevices voor non-bestaande org ===");
const noDevices = await listOrgDevices(FAKE_ORG_ID);
assert("returns empty array", Array.isArray(noDevices) && noDevices.length === 0);

console.log("\n=== Test: findUnassignedSeat voor non-bestaande org ===");
const noFree = await findUnassignedSeat(FAKE_ORG_ID);
assert("returns null", noFree === null);

console.log("\n=== Test: pricingTiers integration ===");
const tier5 = getTierForSeats(5);
assert("5 seats → tier_5_9", tier5.id === "tier_5_9");
assert("5 seats prijs €108", tier5.pricePerSeatCents === 10_800);

console.log("\n=== Test: end-to-end seat-creation cyclus (test-org) ===");
// Maak een test-org aan via auth.organization
const testSlug = `test-seats-${Date.now()}`;
const [testOrg] = await dbAuth
  .insert(authOrg)
  .values({
    name: "Test Org (auto-cleanup)",
    slug: testSlug,
  })
  .returning({ id: authOrg.id, name: authOrg.name });
console.log(`  → test-org aangemaakt: ${testOrg.id}`);

try {
  // Snapshot moet leeg zijn
  let snap = await getOrgSeatSnapshot(testOrg.id);
  assert("nieuwe org heeft 0 seats", snap.totalSeats === 0);

  // Maak 3 unassigned seats
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const created = await createUnassignedSeats({
    organizationId: testOrg.id,
    count: 3,
    planId: null,
    orderId: null,
    expiresAt,
    source: "test-script",
  });
  assert("createUnassignedSeats geeft 3 ids", created.licenseIds.length === 3);
  assert("3 unieke codes", new Set(created.codes).size === 3);
  assert(
    "codes format DIC-TEAM-YYYY-XXXX-XXXX",
    created.codes.every((c) => /^DIC-TEAM-\d{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(c)),
  );

  // Snapshot moet nu 3 unassigned tonen
  snap = await getOrgSeatSnapshot(testOrg.id);
  assert("snapshot 3 totaal", snap.totalSeats === 3);
  assert("0 toegewezen", snap.assignedSeats === 0);
  assert("3 vrij", snap.unassignedFreeSeats === 3);
  assert("maxDevices = 6", snap.maxDevicesTotal === 6);
  assert("tier_1_4 voor 3 seats", snap.currentTier.id === "tier_1_4");

  // listOrgSeats returnt de 3
  const seats = await listOrgSeats(testOrg.id);
  assert("3 seat-rows", seats.length === 3);
  assert(
    "alle status=unassigned",
    seats.every((s) => s.status === "unassigned"),
  );
  assert(
    "alle assignedUserId=null",
    seats.every((s) => s.assignedUserId === null),
  );
  assert(
    "0 active devices per seat",
    seats.every((s) => s.activeDevicesCount === 0),
  );

  // findUnassignedSeat pakt een van de drie
  const free = await findUnassignedSeat(testOrg.id);
  assert("findUnassignedSeat returnt een seat", free !== null);
  assert(
    "free seat is een van de gemaakte",
    free !== null && created.licenseIds.includes(free.id),
  );

  // Revoke een seat
  const revokeRes = await revokeSeat({
    licenseId: created.licenseIds[0],
    actorUserId: ADMIN_USER_ID,
    reason: "owner_action",
  });
  assert("revoke: 0 devices (geen activations)", revokeRes.revokedDevices === 0);
  assert("revoke: previousUserId null", revokeRes.previousUserId === null);

  // Snapshot herrekend: 2 actief, 1 revoked (uit totaal)
  snap = await getOrgSeatSnapshot(testOrg.id);
  assert("na revoke: 2 actieve seats", snap.totalSeats === 2);
  assert("1 revoked geteld", snap.revokedSeats === 1);

  // Cross-tier: voeg 4 seats toe → 6 totaal → tier_5_9 (10%)
  await createUnassignedSeats({
    organizationId: testOrg.id,
    count: 4,
    planId: null,
    orderId: null,
    expiresAt,
    source: "test-script-tier2",
  });
  snap = await getOrgSeatSnapshot(testOrg.id);
  assert("6 actieve seats na bijmaak", snap.totalSeats === 6);
  assert("tier-overgang naar tier_5_9", snap.currentTier.id === "tier_5_9");
  assert("perSeatPrice = €108 (10%)", snap.perSeatPriceCents === 10_800);

  console.log("\n  → alle service-level checks groen");
} finally {
  // Cleanup: verwijder test-licenties + test-org
  console.log("\n  → cleanup test-org");
  await db.delete(licenses).where(eq(licenses.organizationId, testOrg.id));
  await dbAuth.delete(authOrg).where(eq(authOrg.id, testOrg.id));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
