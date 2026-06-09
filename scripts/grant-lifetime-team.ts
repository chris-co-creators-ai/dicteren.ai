// Eenmalig: lifetime-licentie voor team-leden via de canonieke admin-grant-flow.
// Run: cd web && bun --conditions=react-server scripts/grant-lifetime-team.ts
// Idempotent: skipt een user die al een active lifetime admin-grant heeft.
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { licenses } from "@/lib/db/schema";
import { grantLifetimeLicense } from "@/lib/services/adminGrant";

const GRANTER = "27a4ea0a-ad8e-4240-8116-3d3a84de3a9d"; // info@dicteren.ai (Christian Bleeker)

const TEAM = [
  { email: "brian@dicteren.ai", id: "262c5d67-0c36-4350-9814-137097620ccd" },
  { email: "krishna@dicteren.ai", id: "fc185f00-186c-4ea5-a4f0-8ec7fc7a1378" },
  { email: "lars@dicteren.ai", id: "df5a4fd8-e523-4f9d-a3a7-4fac87583dc9" },
];

for (const u of TEAM) {
  const existing = await db
    .select({ code: licenses.code })
    .from(licenses)
    .where(
      and(
        eq(licenses.userId, u.id),
        eq(licenses.source, "admin-grant"),
        eq(licenses.discountType, "lifetime"),
        eq(licenses.status, "active"),
      ),
    );
  if (existing.length) {
    console.log(`SKIP  ${u.email} (heeft al lifetime: ${existing[0].code})`);
    continue;
  }
  const r = await grantLifetimeLicense({
    userId: u.id,
    type: "consumer",
    grantedByUserId: GRANTER,
    notes: "Lifetime team-access",
  });
  console.log(`GRANT ${u.email} -> ${r.code} (${r.licenseId})`);
}

process.exit(0);
