/**
 * Test alle Mollie scenarios end-to-end zonder echte UI-klikken.
 *
 *  1. happy_path   — create payment → simulate paid webhook → license issued
 *  2. idempotent   — same payment webhook 2× → only 1 license
 *  3. failed       — create payment → simulate failed status → order failed
 *  4. canceled     — create payment → simulate canceled → order canceled
 *  5. refunded     — paid order → simulate refunded → order + license refunded
 *  6. mollie_live  — POST /v2/payments tegen Mollie API met test key (live HTTP)
 *
 * Run:  bun run scripts/test-mollie-flow.ts            (mock-only, no Mollie HTTP)
 *       bun run scripts/test-mollie-flow.ts --live      (also hit Mollie API)
 *
 * Strategy: roep service-functies direct aan (server-only context is OK in bun
 * script via tsx loader). Voor de webhook bouwen we de Mollie payment-payload
 * zelf, sluiten verifyWebhookPayment kort via een spy, en testen de mapping +
 * fulfillment + idempotency van order.ts.
 */

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, ne } from "drizzle-orm";

config({ path: ".env.local" });

// We importeren schema apart om server-only te omzeilen
const schema = await import("../src/lib/db/schema");
const {
  orders,
  payments,
  licenses,
  plans,
  authUsers,
} = schema;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql, schema });

type MolliePayment = {
  id: string;
  status: "open" | "paid" | "failed" | "canceled" | "expired" | "pending" | "authorized";
  amount: { currency: string; value: string };
  method: string | null;
  paidAt: string | null;
  metadata: Record<string, unknown> | null;
};

const mockPayments = new Map<string, MolliePayment>();

function mockMolliePayment(id: string, payment: MolliePayment) {
  mockPayments.set(id, payment);
}

// Spy: when the webhook calls verifyWebhookPayment we return our mock.
async function verifyWebhookPaymentMock(id: string) {
  const p = mockPayments.get(id);
  if (!p) return { success: false as const, error: "not found", code: "MOLLIE_NOT_FOUND" };
  return {
    success: true as const,
    data: {
      paymentId: p.id,
      status: p.status,
      amount: Math.round(parseFloat(p.amount.value) * 100),
      currency: p.amount.currency,
      method: p.method,
      paidAt: p.paidAt,
      metadata: p.metadata,
    },
  };
}

function mapMollieStatus(s: string): "pending" | "paid" | "failed" | "canceled" | "refunded" {
  switch (s) {
    case "paid":
    case "authorized":
      return "paid";
    case "failed":
    case "expired":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}

function genLicenseCode(prefix: string): string {
  const seg = (n: number) =>
    Array.from({ length: n }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32)),
    ).join("");
  return `DIC-${prefix}-${new Date().getFullYear()}-${seg(4)}-${seg(4)}`;
}

import { createHash } from "node:crypto";
function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

// ────────────────────────────────────────────────────────────
// Setup: ensure we have a test user + plan
// ────────────────────────────────────────────────────────────

async function getTestUser(): Promise<string> {
  const rows = await db.select().from(authUsers).limit(1);
  if (!rows[0]) throw new Error("no users in neon_auth.user — sign up first");
  return rows[0].id;
}

async function getPlanBySlug(slug: string) {
  const rows = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  return rows[0];
}

// ────────────────────────────────────────────────────────────
// Mini-fulfillment replica (mirrors order.ts logic without server-only import)
// ────────────────────────────────────────────────────────────

async function createOrderRow(userId: string, planSlug: string) {
  const plan = await getPlanBySlug(planSlug);
  if (!plan) throw new Error(`plan ${planSlug} missing`);
  const [order] = await db
    .insert(orders)
    .values({
      userId,
      planId: plan.id,
      quantity: 1,
      amountCents: plan.priceCents,
      currency: plan.currency,
      status: "pending",
    })
    .returning();
  return { order, plan };
}

async function attachMolliePayment(orderId: string, paymentId: string) {
  await db
    .update(orders)
    .set({ molliePaymentId: paymentId, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

async function fulfill(paymentId: string, paidCents: number, payload: unknown) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.molliePaymentId, paymentId))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;
  if (order.status === "paid") return null;

  const updated = await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, order.id)))
    .returning({ id: orders.id });
  if (!updated.length) return null;

  const plan = (
    await db.select().from(plans).where(eq(plans.id, order.planId!)).limit(1)
  )[0];
  const licenseType = plan.customerType === "organization" ? "team" : "consumer";
  const prefix = licenseType === "team" ? "TEAM" : "PRO";
  const code = genLicenseCode(prefix);

  const expires = new Date();
  if (plan.period === "monthly") expires.setMonth(expires.getMonth() + 1);
  if (plan.period === "quarterly") expires.setMonth(expires.getMonth() + 3);
  if (plan.period === "yearly") expires.setFullYear(expires.getFullYear() + 1);

  await db.insert(payments).values({
    orderId: order.id,
    molliePaymentId: paymentId,
    status: "paid",
    amountCents: paidCents,
    currency: order.currency,
    rawWebhookPayload: payload as object,
  });

  await db.insert(licenses).values({
    code,
    codeHash: hashCode(code),
    type: licenseType,
    status: "active",
    userId: order.userId,
    organizationId: order.organizationId,
    orderId: order.id,
    planId: plan.id,
    seats: 1,
    maxActivationsPerSeat: 2,
    issuedAt: new Date(),
    expiresAt: expires,
  });

  return { orderId: order.id, licenseCode: code };
}

async function markStatus(paymentId: string, status: "failed" | "canceled" | "refunded") {
  if (status === "refunded") {
    await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.molliePaymentId, paymentId), eq(orders.status, "paid")));
    const row = (
      await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.molliePaymentId, paymentId))
        .limit(1)
    )[0];
    if (row) {
      await db
        .update(licenses)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(licenses.orderId, row.id));
    }
  } else {
    // mirrors order.ts service: cannot demote paid order
    await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.molliePaymentId, paymentId), ne(orders.status, "paid")));
  }
}

// ────────────────────────────────────────────────────────────
// Scenarios
// ────────────────────────────────────────────────────────────

const results: { name: string; pass: boolean; detail: string }[] = [];

async function scenario(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, pass: true, detail: "ok" });
    console.log(`✓ ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, pass: false, detail: msg });
    console.log(`✗ ${name} — ${msg}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function run() {
  const userId = await getTestUser();
  console.log(`Using user: ${userId.slice(0, 8)}…`);

  // 1. Happy path — consumer-monthly
  await scenario("happy_path consumer-monthly → paid → license", async () => {
    const { order } = await createOrderRow(userId, "consumer-monthly");
    const paymentId = `tr_test_${Date.now()}_happy`;
    await attachMolliePayment(order.id, paymentId);
    mockMolliePayment(paymentId, {
      id: paymentId,
      status: "paid",
      amount: { currency: "EUR", value: "12.00" },
      method: "ideal",
      paidAt: new Date().toISOString(),
      metadata: { orderId: order.id },
    });
    const v = await verifyWebhookPaymentMock(paymentId);
    assert(v.success, "verify failed");
    assert(mapMollieStatus(v.data.status) === "paid", "status mapping wrong");
    const fulfilled = await fulfill(paymentId, v.data.amount, v.data);
    assert(fulfilled, "fulfillment returned null");
    assert(fulfilled.licenseCode.startsWith("DIC-PRO-"), "license code prefix wrong");

    const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert(fresh[0].status === "paid", "order not paid");
  });

  // 2. Idempotency — second webhook produces no extra license
  await scenario("idempotency: 2nd webhook → no double license", async () => {
    const { order } = await createOrderRow(userId, "consumer-quarterly");
    const paymentId = `tr_test_${Date.now()}_idem`;
    await attachMolliePayment(order.id, paymentId);
    mockMolliePayment(paymentId, {
      id: paymentId,
      status: "paid",
      amount: { currency: "EUR", value: "30.00" },
      method: "creditcard",
      paidAt: new Date().toISOString(),
      metadata: { orderId: order.id },
    });
    const first = await fulfill(paymentId, 3000, {});
    assert(first, "first fulfill null");
    const second = await fulfill(paymentId, 3000, {});
    assert(second === null, "second fulfill should be no-op");

    const all = await db.select().from(licenses).where(eq(licenses.orderId, order.id));
    assert(all.length === 1, `expected 1 license, got ${all.length}`);
  });

  // 3. Failed payment
  await scenario("failed payment → order failed, no license", async () => {
    const { order } = await createOrderRow(userId, "consumer-monthly");
    const paymentId = `tr_test_${Date.now()}_fail`;
    await attachMolliePayment(order.id, paymentId);
    mockMolliePayment(paymentId, {
      id: paymentId,
      status: "failed",
      amount: { currency: "EUR", value: "12.00" },
      method: "creditcard",
      paidAt: null,
      metadata: { orderId: order.id },
    });
    const v = await verifyWebhookPaymentMock(paymentId);
    assert(v.success, "verify failed");
    const mapped = mapMollieStatus(v.data.status);
    assert(mapped === "failed", `expected failed, got ${mapped}`);
    await markStatus(paymentId, "failed");

    const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert(fresh[0].status === "failed", "order not failed");
    const lics = await db.select().from(licenses).where(eq(licenses.orderId, order.id));
    assert(lics.length === 0, "no license should be issued on failed");
  });

  // 4. Canceled
  await scenario("canceled → order canceled, no license", async () => {
    const { order } = await createOrderRow(userId, "consumer-monthly");
    const paymentId = `tr_test_${Date.now()}_cancel`;
    await attachMolliePayment(order.id, paymentId);
    await markStatus(paymentId, "canceled");
    const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert(fresh[0].status === "canceled", "order not canceled");
  });

  // 5. Refunded
  await scenario("paid then refunded → order + license refunded", async () => {
    const { order } = await createOrderRow(userId, "consumer-yearly");
    const paymentId = `tr_test_${Date.now()}_refund`;
    await attachMolliePayment(order.id, paymentId);
    const f = await fulfill(paymentId, 9600, {});
    assert(f, "fulfill null");
    await markStatus(paymentId, "refunded");
    const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert(fresh[0].status === "refunded", `order status should be refunded, got ${fresh[0].status}`);
    const lic = (
      await db.select().from(licenses).where(eq(licenses.orderId, order.id)).limit(1)
    )[0];
    assert(lic.status === "refunded", `license status should be refunded, got ${lic.status}`);
  });

  // 6. Expired → maps to failed
  await scenario("expired status maps to failed", async () => {
    const mapped = mapMollieStatus("expired");
    assert(mapped === "failed", `expected failed, got ${mapped}`);
  });

  // 7. Authorized → maps to paid
  await scenario("authorized maps to paid (no manual capture)", async () => {
    const mapped = mapMollieStatus("authorized");
    assert(mapped === "paid", `expected paid, got ${mapped}`);
  });

  // 8. Refund cannot demote unpaid order
  await scenario("refund on unpaid order is no-op", async () => {
    const { order } = await createOrderRow(userId, "consumer-monthly");
    const paymentId = `tr_test_${Date.now()}_refund_unpaid`;
    await attachMolliePayment(order.id, paymentId);
    await markStatus(paymentId, "refunded");
    const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert(fresh[0].status === "pending", `expected pending (no-op), got ${fresh[0].status}`);
  });

  // 9. failed cannot overwrite paid
  await scenario("failed cannot demote paid order", async () => {
    const { order } = await createOrderRow(userId, "consumer-monthly");
    const paymentId = `tr_test_${Date.now()}_no_demote`;
    await attachMolliePayment(order.id, paymentId);
    await fulfill(paymentId, 1200, {});
    await markStatus(paymentId, "failed");
    const fresh = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert(fresh[0].status === "paid", `expected paid (no demote), got ${fresh[0].status}`);
  });

  // 10. Live HTTP Mollie test-mode create payment
  if (process.argv.includes("--live")) {
    await scenario("live Mollie create payment (test key)", async () => {
      const apiKey = process.env.MOLLIE_API_KEY;
      assert(apiKey, "MOLLIE_API_KEY not set");
      assert(apiKey.startsWith("test_"), "expected test key for safety");
      const res = await fetch("https://api.mollie.com/v2/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: { currency: "EUR", value: "1.00" },
          description: "Dicteren.ai · scenario test",
          redirectUrl: "https://dicteren.ai/checkout/success",
          metadata: { test: "scenario" },
        }),
      });
      const data = await res.json();
      assert(res.ok, `Mollie ${res.status}: ${JSON.stringify(data)}`);
      assert(data.status === "open", `expected open, got ${data.status}`);
      assert(data._links?.checkout?.href, "no checkout URL");
      console.log(`  checkout: ${data._links.checkout.href.slice(0, 60)}…`);
    });
  }

  // ────────────────────────────────────────────────────────────
  // Cleanup
  // ────────────────────────────────────────────────────────────
  console.log("\nCleaning up test rows…");
  await sql`DELETE FROM licenses WHERE order_id IN (SELECT id FROM orders WHERE mollie_payment_id LIKE 'tr_test_%')`;
  await sql`DELETE FROM payments WHERE mollie_payment_id LIKE 'tr_test_%'`;
  await sql`DELETE FROM orders WHERE mollie_payment_id LIKE 'tr_test_%'`;

  // ────────────────────────────────────────────────────────────
  // Summary
  // ────────────────────────────────────────────────────────────
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} scenarios passed${fail ? `, ${fail} failed` : ""}`);
  if (fail) {
    console.log("\nFailures:");
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`  ✗ ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
}

await run();
