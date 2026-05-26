// Stuurt alle 14 brand-templates naar info@dicteren.ai met dummy-data.
// Run: bun --conditions=react-server scripts/send-template-previews.ts
//
// Memory feedback_bun_react_server_condition: scripts die service-files
// importeren die `import "server-only"` doen moeten met de react-server
// conditie draaien.

import {
  sendLicenseEmail,
  sendWelcomeEmail,
  sendPastDueEmail,
  sendCancelEmail,
  sendRefundEmail,
  sendRenewalEmail,
  sendTrialStartedEmail,
  sendTrialReminderD7Email,
  sendTrialReminderD13Email,
  sendTrialExpiredEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendOrganizationInviteEmail,
  sendStaffWelcomeEmail,
} from "../src/lib/services/email";

const TO = "info@dicteren.ai";
const NAME = "Christian";
const STAMP = Date.now().toString(36);

const now = new Date();
const inDays = (n: number) => new Date(now.getTime() + n * 86_400_000);

const TEMPLATES: Array<{ label: string; run: () => Promise<unknown> }> = [
  {
    label: "01. License issued",
    run: () =>
      sendLicenseEmail({
        to: TO,
        name: NAME,
        licenseCode: `DIC-PRO-PREVIEW-${STAMP.toUpperCase()}`,
        expiresAt: inDays(365),
      }),
  },
  {
    label: "02. Welcome",
    run: () => sendWelcomeEmail({ to: TO, name: NAME }),
  },
  {
    label: "03. Subscription past due",
    run: () =>
      sendPastDueEmail({
        to: TO,
        name: NAME,
        graceUntil: inDays(14),
        subscriptionId: `sub_preview_${STAMP}`,
      }),
  },
  {
    label: "04. Subscription canceled",
    run: () =>
      sendCancelEmail({
        to: TO,
        name: NAME,
        expiresAt: inDays(28),
        subscriptionId: `sub_preview_${STAMP}`,
      }),
  },
  {
    label: "05. Refund",
    run: () =>
      sendRefundEmail({
        to: TO,
        name: NAME,
        amountCents: 1200,
        currency: "EUR",
        orderId: `ord_preview_${STAMP}`,
      }),
  },
  {
    label: "06. Subscription renewed",
    run: () =>
      sendRenewalEmail({
        to: TO,
        name: NAME,
        amountCents: 1200,
        currency: "EUR",
        newExpiresAt: inDays(30),
        subscriptionId: `sub_preview_${STAMP}`,
        paymentId: `pay_preview_${STAMP}`,
      }),
  },
  {
    label: "07. Trial started",
    run: () =>
      sendTrialStartedEmail({
        to: TO,
        name: NAME,
        licenseCode: `DIC-TRIAL-PREVIEW-${STAMP.toUpperCase()}`,
        expiresAt: inDays(14),
      }),
  },
  {
    label: "08. Trial reminder D7",
    run: () =>
      sendTrialReminderD7Email({
        to: TO,
        name: NAME,
        daysLeft: 7,
        expiresAt: inDays(7),
      }),
  },
  {
    label: "09. Trial reminder D13",
    run: () =>
      sendTrialReminderD13Email({
        to: TO,
        name: NAME,
        expiresAt: inDays(1),
      }),
  },
  {
    label: "10. Trial expired",
    run: () => sendTrialExpiredEmail({ to: TO, name: NAME }),
  },
  {
    label: "11. Password reset",
    run: () =>
      sendPasswordResetEmail({
        to: TO,
        name: NAME,
        resetUrl: `https://www.dicteren.ai/auth/reset-password?token=preview-${STAMP}&callbackURL=/account`,
      }),
  },
  {
    label: "12. Email verification",
    run: () =>
      sendEmailVerificationEmail({
        to: TO,
        name: NAME,
        verifyUrl: `https://www.dicteren.ai/auth/verify-email?token=preview-${STAMP}&callbackURL=/account`,
      }),
  },
  {
    label: "13. Organization invite",
    run: () =>
      sendOrganizationInviteEmail({
        to: TO,
        inviterName: "Brian Hupsel",
        organizationName: "Dicteren.ai HQ",
        inviteUrl: `https://www.dicteren.ai/auth/accept-invitation/preview-${STAMP}`,
      }),
  },
  {
    label: "14. Staff welcome",
    run: () =>
      sendStaffWelcomeEmail({
        to: TO,
        name: NAME,
        role: "admin",
        setPasswordUrl: `https://www.dicteren.ai/auth/set-password?token=preview-${STAMP}`,
        adminUrl: "https://www.dicteren.ai/admin",
        hasLifetime: true,
        inviterName: "Brian Hupsel",
      }),
  },
];

async function main() {
  console.log(`\nVerstuurt ${TEMPLATES.length} templates naar ${TO}...\n`);
  let ok = 0;
  let fail = 0;
  for (const t of TEMPLATES) {
    process.stdout.write(`  ${t.label.padEnd(35)} `);
    try {
      const res = (await t.run()) as { success: boolean; error?: string };
      if (res.success) {
        console.log("✓");
        ok++;
      } else {
        console.log(`✗  ${res.error}`);
        fail++;
      }
    } catch (err) {
      console.log(`✗  ${(err as Error).message}`);
      fail++;
    }
    // Spread iets uit zodat Resend per-second-limit niet raakt en
    // de inbox-volgorde voorspelbaar blijft.
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`\n${ok} verstuurd, ${fail} fouten.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
