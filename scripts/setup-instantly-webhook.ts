// Dicteren.ai — Instantly webhook setup (config-as-code)
//
// Maakt of update de Instantly-webhook die lifecycle-events naar
// https://www.dicteren.ai/api/instantly/webhook stuurt, met de
// x-instantly-secret header. Idempotent: bestaat er al een webhook op
// dezelfde target-URL, dan wordt die gepatcht in plaats van gedupliceerd.
//
// Vereist in web/.env.local (bun laadt die automatisch):
//   INSTANTLY_API_KEY        — Instantly API v2 key, scopes webhooks:all of all:all
//   INSTANTLY_WEBHOOK_SECRET — dezelfde waarde als in Vercel
//
// Run: bun scripts/setup-instantly-webhook.ts

export {};

const API = "https://api.instantly.ai/api/v2";
const TARGET = "https://www.dicteren.ai/api/instantly/webhook";

const apiKey = process.env.INSTANTLY_API_KEY;
const secret = process.env.INSTANTLY_WEBHOOK_SECRET;
if (!apiKey) throw new Error("INSTANTLY_API_KEY ontbreekt in .env.local");
if (!secret) throw new Error("INSTANTLY_WEBHOOK_SECRET ontbreekt in .env.local");

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} -> ${res.status}: ${await res.text()}`,
    );
  }
  return res.json();
}

type WebhookListItem = {
  id: string;
  target_hook_url: string;
  event_type: string | null;
  name: string | null;
};

const list = (await api("/webhooks?limit=100")) as {
  items?: WebhookListItem[];
};
const existing = (list.items ?? []).find(
  (w) => w.target_hook_url === TARGET,
);

const body = JSON.stringify({
  name: "Dicteren.ai CRM bridge",
  target_hook_url: TARGET,
  event_type: "all_events",
  headers: { "x-instantly-secret": secret },
});

if (existing) {
  await api(`/webhooks/${existing.id}`, { method: "PATCH", body });
  console.log(`Webhook ${existing.id} bijgewerkt: all_events + secret-header.`);
} else {
  const created = (await api("/webhooks", { method: "POST", body })) as {
    id: string;
  };
  console.log(`Webhook ${created.id} aangemaakt: all_events + secret-header.`);
}

const health = (await fetch(TARGET).then((r) => r.json())) as {
  configured: boolean;
};
console.log(
  `Route health: configured=${health.configured}` +
    (health.configured
      ? ""
      : " — zet INSTANTLY_WEBHOOK_SECRET nog in Vercel."),
);
