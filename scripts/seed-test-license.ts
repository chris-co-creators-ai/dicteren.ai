/**
 * Maak een test-licentie aan voor lokale desktop-app verificatie.
 * Print de code naar stdout. SHA256-hash wordt opgeslagen in DB.
 *
 * Run:  bun run scripts/seed-test-license.ts
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

config({ path: ".env.local" });

const schema = await import("../src/lib/db/schema");
const { licenses, plans } = schema;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

const seg = () => randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
const code = `DIC-PRO-${new Date().getFullYear()}-${seg()}-${seg()}`;
const codeHash = createHash("sha256")
  .update(code.toUpperCase().replace(/[\s-]/g, ""))
  .digest("hex");

const [plan] = await db
  .select()
  .from(plans)
  .where(eq(plans.slug, "consumer-yearly"))
  .limit(1);

const expiresAt = new Date();
expiresAt.setFullYear(expiresAt.getFullYear() + 1);

const [row] = await db
  .insert(licenses)
  .values({
    code,
    codeHash,
    type: "consumer",
    status: "active",
    planId: plan?.id ?? null,
    seats: 1,
    maxActivationsPerSeat: 2,
    issuedAt: new Date(),
    expiresAt,
    notes: "Lokale desktop-app test (geen user-link)",
  })
  .returning();

console.log("");
console.log("─────────────────────────────────────────────");
console.log("  TEST LICENSE CODE");
console.log("─────────────────────────────────────────────");
console.log(`  ${code}`);
console.log("─────────────────────────────────────────────");
console.log(`  status:   active`);
console.log(`  plan:     ${plan?.slug ?? "no plan"}`);
console.log(`  expires:  ${expiresAt.toISOString().slice(0, 10)}`);
console.log(`  devices:  ${row.seats * row.maxActivationsPerSeat} max`);
console.log(`  db-id:    ${row.id}`);
console.log("");
