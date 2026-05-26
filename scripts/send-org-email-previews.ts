// Stuur alle 11 nieuwe org-emails naar info@dicteren.ai als preview.
//
// Draaien met:
//   cd web && bun --conditions=react-server scripts/send-org-email-previews.ts
//
// Vereist .env.local met RESEND_API_KEY ingeladen.

import { config } from "dotenv";
config({ path: ".env.local" });

import { sendOrganizationInviteEmail } from "../src/lib/services/email";
import {
  sendOrgMemberWelcomeEmail,
  sendOrgOwnerMemberJoinedEmail,
  sendOrgMemberRemovedEmail,
  sendOrgOwnerMemberLeftEmail,
  sendOrgInviteReminderEmail,
  sendOrgSeatsExpandedEmail,
  sendOrgSeatsReducedEmail,
  sendOrgTierChangedEmail,
  sendOrgDeviceRevokedEmail,
  sendOrgSubscriptionCanceledEmail,
} from "../src/lib/services/orgEmail";

const TO = "info@dicteren.ai";
const ORG_NAME = "Acme Advocaten BV";
const OWNER_NAME = "Christian Bleeker";
const MEMBER_NAME = "Jan de Vries";
const MEMBER_EMAIL = "jan@acme.nl";
const INVITER_NAME = "Christian";
const INVITE_URL = "https://www.dicteren.ai/auth/accept-invitation/preview-uuid";
const CODE_A = "DIC-TEAM-2026-A4F2-7BC1";
const CODE_B = "DIC-TEAM-2026-B8E3-9D44";
const CODE_C = "DIC-TEAM-2026-C9D1-3E67";
const EXPIRES_TWO_DAYS = new Date(Date.now() + 48 * 60 * 60 * 1000);
const NEXT_BILLING = new Date(Date.now() + 30 * 86_400_000);

const checks: Array<{ label: string; result: { success: boolean; error?: string; code?: string } }> = [];

async function run(label: string, fn: () => Promise<{ success: boolean; error?: string; code?: string }>) {
  process.stdout.write(`  → ${label}... `);
  try {
    const r = await fn();
    if (r.success) {
      console.log("✓");
    } else {
      console.log(`✗ (${r.code ?? "?"}: ${r.error})`);
    }
    checks.push({ label, result: r });
  } catch (err) {
    console.log(`✗ throw: ${(err as Error).message}`);
    checks.push({
      label,
      result: { success: false, error: (err as Error).message, code: "THROW" },
    });
  }
}

console.log("\n=== Verstuur 11 org-email previews naar", TO, "===\n");

await run("1. Invite-mail met seat-code in body", () =>
  sendOrganizationInviteEmail({
    to: TO,
    inviterName: INVITER_NAME,
    organizationName: ORG_NAME,
    inviteUrl: INVITE_URL,
    licenseCode: CODE_A,
  }),
);

await run("2. Welcome (na accept) met code", () =>
  sendOrgMemberWelcomeEmail({
    to: TO,
    name: MEMBER_NAME,
    organizationName: ORG_NAME,
    licenseCode: CODE_A,
  }),
);

await run("3. Owner: member joined", () =>
  sendOrgOwnerMemberJoinedEmail({
    to: TO,
    ownerName: OWNER_NAME,
    organizationName: ORG_NAME,
    memberEmail: MEMBER_EMAIL,
    memberName: MEMBER_NAME,
  }),
);

await run("4. Member: seat ingetrokken", () =>
  sendOrgMemberRemovedEmail({
    to: TO,
    name: MEMBER_NAME,
    organizationName: ORG_NAME,
  }),
);

await run("5. Owner: member heeft verlaten", () =>
  sendOrgOwnerMemberLeftEmail({
    to: TO,
    ownerName: OWNER_NAME,
    organizationName: ORG_NAME,
    memberEmail: MEMBER_EMAIL,
    memberName: MEMBER_NAME,
  }),
);

await run("6. Invite-reminder (24u nudge)", () =>
  sendOrgInviteReminderEmail({
    to: TO,
    organizationName: ORG_NAME,
    inviterName: INVITER_NAME,
    inviteUrl: INVITE_URL,
    licenseCode: CODE_B,
    expiresAt: EXPIRES_TWO_DAYS,
  }),
);

await run("7. Seats uitgebreid (binnen tier)", () =>
  sendOrgSeatsExpandedEmail({
    to: TO,
    ownerName: OWNER_NAME,
    organizationName: ORG_NAME,
    delta: 3,
    newTotal: 8,
    newAnnualCents: 86_400, // 8 × €108
    currency: "EUR",
    prorataChargeCents: 16_155, // pro-rata 3 seats half jaar
    newCodes: [CODE_A, CODE_B, CODE_C],
  }),
);

await run("8. Seats verlaagd", () =>
  sendOrgSeatsReducedEmail({
    to: TO,
    ownerName: OWNER_NAME,
    organizationName: ORG_NAME,
    delta: 2,
    newTotal: 6,
    newAnnualCents: 64_800, // 6 × €108
    currency: "EUR",
    nextBillingAt: NEXT_BILLING,
  }),
);

await run("9. Tier-overgang (cross-tier upgrade)", () =>
  sendOrgTierChangedEmail({
    to: TO,
    ownerName: OWNER_NAME,
    organizationName: ORG_NAME,
    newTierLabel: "5-9 seats",
    newDiscountPct: 10,
    newPerSeatCents: 10_800,
    direction: "up",
    currency: "EUR",
  }),
);

await run("10. Device uitgelogd door owner", () =>
  sendOrgDeviceRevokedEmail({
    to: TO,
    name: MEMBER_NAME,
    organizationName: ORG_NAME,
    platform: "darwin-arm64",
    revokedByName: OWNER_NAME,
  }),
);

await run("11. Subscription opgezegd (owner-versie)", () =>
  sendOrgSubscriptionCanceledEmail({
    to: TO,
    name: OWNER_NAME,
    organizationName: ORG_NAME,
    accessUntil: NEXT_BILLING,
    recipientType: "owner",
  }),
);

await run("11b. Subscription opgezegd (member-versie)", () =>
  sendOrgSubscriptionCanceledEmail({
    to: TO,
    name: MEMBER_NAME,
    organizationName: ORG_NAME,
    accessUntil: NEXT_BILLING,
    recipientType: "member",
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
