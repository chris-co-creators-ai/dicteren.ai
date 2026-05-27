// Stuur alle 4 affiliate-emails naar info@dicteren.ai als preview.
//
// Draaien:
//   cd web && bun --conditions=react-server scripts/send-affiliate-email-previews.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  sendAffiliateApprovedEmail,
  sendAffiliateFirstCommissionEmail,
  sendAffiliatePayoutScheduledEmail,
  sendAffiliatePayoutPaidEmail,
} from "../src/lib/services/affiliateEmail";

const TO = "info@dicteren.ai";
const NAME = "Jan de Vries";

const checks: Array<{ label: string; result: { success: boolean; error?: string; code?: string } }> = [];

async function run(label: string, fn: () => Promise<{ success: boolean; error?: string; code?: string }>) {
  process.stdout.write(`  → ${label}... `);
  try {
    const r = await fn();
    if (r.success) console.log("✓");
    else console.log(`✗ (${r.code ?? "?"}: ${r.error})`);
    checks.push({ label, result: r });
  } catch (err) {
    console.log(`✗ throw: ${(err as Error).message}`);
    checks.push({ label, result: { success: false, error: (err as Error).message } });
  }
}

console.log("\n=== Verstuur 4 affiliate-email previews naar", TO, "===\n");

await run("1. Approval-mail (pending → active)", () =>
  sendAffiliateApprovedEmail({
    to: TO,
    name: NAME,
    slug: "jan-de-vries",
    contactEmail: TO,
  }),
);

await run("2. Eerste-commissie-mail (consumer)", () =>
  sendAffiliateFirstCommissionEmail({
    to: TO,
    name: NAME,
    amountCents: 1920, // 20% van €96 jaarplan
    customerName: "Marie Bakker",
    customerType: "consumer",
  }),
);

await run("3. Eerste-commissie-mail (business)", () =>
  sendAffiliateFirstCommissionEmail({
    to: TO,
    name: NAME,
    amountCents: 9180, // 15% van €612 (6 seats × €102)
    customerName: "Acme Advocaten",
    customerType: "organization",
  }),
);

await run("4. Maandelijkse payout-aankondiging (25e)", () =>
  sendAffiliatePayoutScheduledEmail({
    to: TO,
    name: NAME,
    totalCents: 12_840, // €128,40
    currency: "EUR",
    commissionCount: 7,
    periodYear: 2026,
    periodMonth: 5,
  }),
);

await run("5. Payout uitbetaald-bevestiging", () =>
  sendAffiliatePayoutPaidEmail({
    to: TO,
    name: NAME,
    totalCents: 12_840,
    currency: "EUR",
    sepaBatchRef: "SEPA-2026-05-25-001",
    periodYear: 2026,
    periodMonth: 5,
  }),
);

console.log("\n=== Samenvatting ===");
const ok = checks.filter((c) => c.result.success).length;
const fail = checks.filter((c) => !c.result.success).length;
console.log(`${ok} verstuurd, ${fail} mislukt`);

if (fail > 0) {
  console.log("\nMislukte verzendingen:");
  for (const c of checks.filter((c) => !c.result.success)) {
    console.log(`  ✗ ${c.label}: ${c.result.code} — ${c.result.error}`);
  }
  process.exit(1);
}
process.exit(0);
