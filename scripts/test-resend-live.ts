// Live Resend send-test — bewijst dat domain verified + key werkt
// Bypasst service-layer (server-only blokkeert bun-scripts).
// Run: bun run scripts/test-resend-live.ts

import { Resend } from "resend";
import "dotenv/config";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL ?? "licenties@send.dicteren.ai";

if (!apiKey) {
  console.error("RESEND_API_KEY mist in .env.local");
  process.exit(1);
}

const resend = new Resend(apiKey);

async function sendTo(label: string, to: string, idempotencyKey: string) {
  const fromAddr = from.includes("<") ? from : `Dicteren.ai <${from}>`;
  const { data, error } = await resend.emails.send(
    {
      from: fromAddr,
      to,
      subject: `[TEST ${label}] Dicteren.ai email-flow check`,
      html: `<p>Dit is een test van de live Resend-integratie. ID: <code>${idempotencyKey}</code></p>`,
      text: `Live Resend integration test. id=${idempotencyKey}`,
      tags: [
        { name: "category", value: "integration_test" },
        { name: "scenario", value: label.toLowerCase() },
      ],
    },
    { idempotencyKey },
  );

  if (error) {
    console.error(`✗ ${label} → ${to}`, error);
    return false;
  }
  console.log(`✓ ${label} → ${to} (id=${data?.id})`);
  return true;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const results = await Promise.all([
  sendTo("delivered", "delivered@resend.dev", `test-delivered/${stamp}`),
  sendTo("inbox", "info@dicteren.ai", `test-inbox/${stamp}`),
]);

const ok = results.every(Boolean);
console.log(ok ? "\nAll sends accepted" : "\nSome sends failed");
process.exit(ok ? 0 : 1);
