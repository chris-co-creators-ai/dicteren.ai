/**
 * End-to-end test van de echte webhook route via HTTP.
 *
 *  1. Maak orders + pending Mollie test payments aan (via Mollie API)
 *  2. Trigger order paid/failed/canceled door Mollie test-dashboard… maar dat
 *     vereist klik in de UI. Voor automated test: roepen we de webhook route
 *     rechtstreeks aan met onze test payment id — Mollie returnt de echte
 *     payment status ("open"). De route ackt met 200, status=pending.
 *  3. Voor `paid`-flow: gebruik een mock payment-id die mockt de fetched
 *     status via een env-flag. Hier doen we het simpeler: we maken een echte
 *     payment, valideren dat de webhook 200 + pending teruggeeft, en dat de
 *     route 400 geeft op missing id.
 *
 *  Run:  bun run scripts/test-webhook-live.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const WEBHOOK = `${BASE}/api/mollie/webhook`;

function log(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const results: boolean[] = [];

async function check(label: string, fn: () => Promise<boolean | string>) {
  try {
    const r = await fn();
    const ok = r === true;
    log(label, ok, typeof r === "string" ? r : "");
    results.push(ok);
  } catch (e) {
    log(label, false, e instanceof Error ? e.message : String(e));
    results.push(false);
  }
}

async function postForm(body: string, contentType = "application/x-www-form-urlencoded") {
  return fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
}

async function postJson(body: object) {
  return fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

await check("GET /api/mollie/webhook responds 200", async () => {
  const res = await fetch(WEBHOOK);
  return res.status === 200;
});

await check("POST without id → 400", async () => {
  const res = await postForm("");
  if (res.status !== 400) return `got ${res.status}`;
  const data = await res.json();
  return data.error?.includes("Missing") ? true : `wrong error: ${data.error}`;
});

await check("POST with unknown id → 404", async () => {
  const res = await postForm("id=tr_does_not_exist_xyz");
  return res.status === 404 ? true : `got ${res.status}`;
});

// Create real Mollie test payment, then post its id (status will be "open" → pending)
await check("real Mollie test payment → 200 status=pending", async () => {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) return "no MOLLIE_API_KEY";
  const create = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: { currency: "EUR", value: "1.00" },
      description: "Dicteren.ai · webhook live test",
      redirectUrl: "https://dicteren.ai/checkout/success",
      metadata: { test: "webhook-live" },
    }),
  });
  const created = await create.json();
  if (!create.ok) return `create failed: ${JSON.stringify(created)}`;

  const res = await postForm(`id=${encodeURIComponent(created.id)}`);
  if (res.status !== 200) return `got ${res.status}`;
  const data = await res.json();
  return data.status === "pending" ? true : `wrong status: ${data.status}`;
});

// JSON body variant
await check("JSON body { id } → accepted", async () => {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) return "no MOLLIE_API_KEY";
  const create = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: { currency: "EUR", value: "1.00" },
      description: "Dicteren.ai · webhook live json",
      redirectUrl: "https://dicteren.ai/checkout/success",
    }),
  });
  const created = await create.json();
  if (!create.ok) return `create failed: ${JSON.stringify(created)}`;
  const res = await postJson({ id: created.id });
  return res.status === 200 ? true : `got ${res.status}`;
});

// Query-param variant
await check("query ?id= → accepted", async () => {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) return "no MOLLIE_API_KEY";
  const create = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: { currency: "EUR", value: "1.00" },
      description: "Dicteren.ai · webhook live query",
      redirectUrl: "https://dicteren.ai/checkout/success",
    }),
  });
  const created = await create.json();
  const res = await fetch(`${WEBHOOK}?id=${encodeURIComponent(created.id)}`, { method: "POST" });
  return res.status === 200 ? true : `got ${res.status}`;
});

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} live-webhook checks passed`);
if (pass !== results.length) process.exit(1);
