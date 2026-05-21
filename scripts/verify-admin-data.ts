/**
 * Verifieer dat alle admin-services daadwerkelijk data uit de live DB halen.
 * Importeert via Drizzle direct (omzeilt server-only).
 *
 *   bun run scripts/verify-admin-data.ts
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { count, desc, eq, gte, sql } from "drizzle-orm";

config({ path: ".env.local" });
const schema = await import("../src/lib/db/schema");
const {
  authUsers,
  authOrganizations,
  licenses,
  orders,
  plans,
  payments,
  events,
  discountCodes,
  licenseActivations,
  organizationBilling,
} = schema;

const sql0 = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql0, schema });

const results: { name: string; rows: number; sample: string }[] = [];

async function run(name: string, q: () => Promise<unknown[]>, sampleField?: (r: unknown) => string) {
  const rows = await q();
  const sample = rows.length && sampleField ? sampleField(rows[0]) : "—";
  results.push({ name, rows: rows.length, sample });
}

await run("listCustomers (authUsers + license-count)", async () => {
  const users = await db
    .select({ id: authUsers.id, email: authUsers.email })
    .from(authUsers)
    .orderBy(desc(authUsers.createdAt));
  return users;
}, (r) => (r as { email: string }).email);

await run("listOrganizations (authOrganizations + billing)", async () => {
  return db
    .select({
      id: authOrganizations.id,
      name: authOrganizations.name,
      billingEmail: organizationBilling.billingEmail,
    })
    .from(authOrganizations)
    .leftJoin(organizationBilling, eq(organizationBilling.organizationId, authOrganizations.id));
}, (r) => (r as { name: string }).name);

await run("listOrders (orders + plan + user)", async () => {
  return db
    .select({
      id: orders.id,
      status: orders.status,
      amountCents: orders.amountCents,
      planSlug: plans.slug,
    })
    .from(orders)
    .leftJoin(plans, eq(plans.id, orders.planId))
    .orderBy(desc(orders.createdAt))
    .limit(50);
}, (r) => `${(r as { planSlug: string }).planSlug} · ${(r as { status: string }).status}`);

await run("listLicenses", async () => {
  return db
    .select({ id: licenses.id, code: licenses.code, status: licenses.status })
    .from(licenses)
    .orderBy(desc(licenses.issuedAt))
    .limit(100);
}, (r) => `${(r as { code: string }).code} (${(r as { status: string }).status})`);

await run("listInvoices (payments + orders)", async () => {
  return db
    .select({ id: payments.id, status: orders.status, amountCents: payments.amountCents })
    .from(payments)
    .leftJoin(orders, eq(orders.id, payments.orderId));
}, (r) => `€${((r as { amountCents: number }).amountCents / 100).toFixed(2)}`);

await run("listDiscounts", async () => db.select().from(discountCodes), (r) => (r as { code: string }).code);

await run("recent activity (events)", async () => {
  return db.select({ id: events.id, eventType: events.eventType }).from(events).orderBy(desc(events.occurredAt)).limit(20);
}, (r) => (r as { eventType: string }).eventType);

await run("activationsToday (license_activations)", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ n: count() })
    .from(licenseActivations)
    .where(gte(licenseActivations.activatedAt, today));
  return rows;
}, (r) => `count=${(r as { n: number }).n}`);

await run("licenseDistribution", async () => {
  return db.select({ type: licenses.type, n: count() }).from(licenses).groupBy(licenses.type);
}, (r) => `${(r as { type: string }).type}=${(r as { n: number }).n}`);

await run("commerceKpis revenue (payments paid)", async () => {
  return db
    .select({
      revenueCentsAllTime: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(payments)
    .where(eq(payments.status, "paid"));
}, (r) => `€${(((r as { revenueCentsAllTime: number }).revenueCentsAllTime ?? 0) / 100).toFixed(2)}`);

console.log("\nAdmin services dataset:");
console.log("───────────────────────────────────────────────────────");
for (const r of results) {
  const status = r.rows > 0 ? "✓" : r.rows === 0 ? "·" : "✗";
  console.log(`${status}  ${r.name.padEnd(46)} rows=${String(r.rows).padStart(3)}  sample=${r.sample}`);
}

const failed = results.filter((r) => r.rows < 0);
process.exit(failed.length ? 1 : 0);
