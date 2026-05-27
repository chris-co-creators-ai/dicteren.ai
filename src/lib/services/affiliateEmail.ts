// Dicteren.ai — Affiliate-emails
//
// 4 templates, alle in Dicteren.ai-branding (zelfde shellHtml als
// orgEmail.ts). Aparte file om services/email.ts compact te houden.

import "server-only";
import { sendEmail } from "./email";
import { emailBase } from "@/lib/url";
import type { ServiceResult } from "@/lib/types";

const BRAND = {
  navy: "#042660",
  navyLink: "#0b3478",
  orange: "#FF8441",
  text: "#1a1f33",
  textMuted: "#5a6478",
  textSoft: "#8d97a8",
  border: "#e5e7ec",
  borderSoft: "#eef0f4",
  bg: "#f7f7f4",
  white: "#ffffff",
  codeBg: "#f4f6fb",
  aquaWash: "#e8f8f9",
} as const;

const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function logoUrl(): string {
  return `${emailBase()}/email/logo.png`;
}

function shellHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${EMAIL_FONT};color:${BRAND.text};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 16px 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.white};border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(4,38,96,0.07);">
          <tr>
            <td style="background:${BRAND.aquaWash};padding:36px 40px 28px 40px;text-align:center;">
              <a href="${emailBase()}" style="text-decoration:none;">
                <img src="${logoUrl()}" alt="Dicteren.ai" width="180" style="display:block;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px 40px;">
              <h1 style="margin:0 0 8px 0;font-size:26px;line-height:1.2;font-weight:700;color:${BRAND.navy};letter-spacing:-0.015em;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 32px 40px;">
              <div style="font-size:16px;line-height:1.65;color:${BRAND.text};">${body}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 40px 28px 40px;border-top:1px solid ${BRAND.borderSoft};background:${BRAND.white};">
              <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.textMuted};">Vragen over je commissie? Mail <a href="mailto:info@dicteren.ai" style="color:${BRAND.navyLink};text-decoration:underline;">info@dicteren.ai</a>.</p>
              <p style="margin:0;font-size:12px;color:${BRAND.textSoft};">Dicteren.ai partner-programma. <a href="${emailBase()}" style="color:${BRAND.textSoft};text-decoration:underline;">dicteren.ai</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function cta(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td style="background:${BRAND.orange};border-radius:12px;"><a href="${href}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:${BRAND.white};text-decoration:none;letter-spacing:0.005em;">${label}</a></td></tr></table>`;
}

function codeBlock(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;"><tr><td style="background:${BRAND.codeBg};border:1px solid ${BRAND.border};border-radius:14px;padding:24px;text-align:center;"><div style="font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:0.04em;color:${BRAND.navy};word-break:break-all;">${code}</div></td></tr></table>`;
}

function brandLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${BRAND.navyLink};text-decoration:underline;">${label}</a>`;
}

function greet(name?: string): string {
  return name ? `Hallo ${name},` : "Hallo,";
}

function formatAmount(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

const MONTH_NAMES = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

type SendResult = { id: string };

// ───── 1. Approval-mail bij activering (pending → active) ─────────

export async function sendAffiliateApprovedEmail(params: {
  to: string;
  name?: string;
  slug: string;
  contactEmail: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je partner-aanmelding is goedgekeurd",
    html: approvedHtml(params),
    text: approvedText(params),
    tags: [{ name: "category", value: "affiliate_approved" }],
    log: { category: "affiliate_approved", userId: params.userId ?? null },
  });
}

function approvedHtml(params: { name?: string; slug: string; contactEmail: string }): string {
  const slugUrl = `${emailBase()}/${params.slug}`;
  return shellHtml(
    "Je bent partner",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">Je aanmelding is goedgekeurd. Je persoonlijke link:</p>
    ${codeBlock(slugUrl)}
    <p style="margin:0 0 14px 0;">Deel deze link met je netwerk. Klanten die via deze link kopen worden 90 dagen lang aan jou gekoppeld, en daarna lifetime via cookie-attributie.</p>
    ${cta(`${emailBase()}/affiliate/dashboard`, "Open je dashboard")}
    <p style="margin:0 0 14px 0;font-weight:700;color:${BRAND.navy};">Zo werkt het:</p>
    <ol style="margin:0;padding:0 0 0 20px;color:${BRAND.text};">
      <li style="margin-bottom:6px;">Klant klikt je link → cookie wordt gezet (90 dagen).</li>
      <li style="margin-bottom:6px;">Klant koopt persoonlijk of zakelijk via Dicteren.ai.</li>
      <li style="margin-bottom:6px;">Na 30 dagen (refund-window voorbij) → commissie wordt vastgezet.</li>
      <li>Rond de 25e van de maand uitbetaling, ${formatAmount(2500)}-drempel.</li>
    </ol>
    <p style="margin:18px 0 0 0;font-size:14px;color:${BRAND.textMuted};">Je commissies zien? Bekijk je ${brandLink(`${emailBase()}/affiliate/dashboard`, "dashboard")} — daar zie je realtime referrals en commissie-status.</p>`,
  );
}

function approvedText(params: { name?: string; slug: string }): string {
  return [
    greet(params.name),
    "",
    "Je aanmelding is goedgekeurd. Je persoonlijke link:",
    `${emailBase()}/${params.slug}`,
    "",
    "Deel deze link met je netwerk. Klanten die via deze link kopen worden",
    "90 dagen aan jou gekoppeld.",
    "",
    `Dashboard: ${emailBase()}/affiliate/dashboard`,
    "",
    "Zo werkt het:",
    "1. Klant klikt je link → cookie wordt gezet (90 dagen).",
    "2. Klant koopt persoonlijk of zakelijk via Dicteren.ai.",
    "3. Na 30 dagen → commissie wordt vastgezet.",
    "4. Rond de 25e van de maand uitbetaling (€25-drempel).",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 2. Eerste-commissie-mail ───────────────────────────────────

export async function sendAffiliateFirstCommissionEmail(params: {
  to: string;
  name?: string;
  amountCents: number;
  customerName?: string;
  customerType: "consumer" | "organization";
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je eerste commissie staat klaar",
    html: firstCommissionHtml(params),
    text: firstCommissionText(params),
    tags: [{ name: "category", value: "affiliate_first_commission" }],
    log: {
      category: "affiliate_first_commission",
      userId: params.userId ?? null,
    },
  });
}

function firstCommissionHtml(params: {
  name?: string;
  amountCents: number;
  customerName?: string;
  customerType: "consumer" | "organization";
}): string {
  const segment =
    params.customerType === "organization" ? "een zakelijke klant" : "een persoonlijke klant";
  return shellHtml(
    "Eerste klant binnen",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">Je hebt zojuist <strong>${segment}</strong> binnengehaald. Verwachte commissie: <strong>${formatAmount(params.amountCents)}</strong>.</p>
    <p style="margin:0 0 14px 0;">De commissie staat nu op <strong>pending</strong>. Na 30 dagen (refund-window voorbij, "klant blijft" garantie) gaat hij naar <strong>payable</strong>. Rond de 25e van de maand erna wordt het uitbetaald.</p>
    ${cta(`${emailBase()}/affiliate/dashboard`, "Bekijk in je dashboard")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Goed gedaan. Blijf delen.</p>`,
  );
}

function firstCommissionText(params: {
  name?: string;
  amountCents: number;
  customerType: "consumer" | "organization";
}): string {
  return [
    greet(params.name),
    "",
    `Je hebt je eerste klant binnen. Verwachte commissie: ${formatAmount(params.amountCents)}.`,
    "",
    "De commissie staat nu op 'pending'. Na 30 dagen wordt hij vastgezet",
    "(payable). Rond de 25e van de maand erna wordt het uitbetaald.",
    "",
    `Dashboard: ${emailBase()}/affiliate/dashboard`,
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 3. Maandelijkse payout-aankondiging ─────────────────────────

export async function sendAffiliatePayoutScheduledEmail(params: {
  to: string;
  name?: string;
  totalCents: number;
  currency: string;
  commissionCount: number;
  periodYear: number;
  periodMonth: number;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Uitbetaling onderweg: ${formatAmount(params.totalCents, params.currency)}`,
    html: payoutScheduledHtml(params),
    text: payoutScheduledText(params),
    tags: [{ name: "category", value: "affiliate_payout_scheduled" }],
    log: {
      category: "affiliate_payout_scheduled",
      userId: params.userId ?? null,
    },
  });
}

function payoutScheduledHtml(params: {
  name?: string;
  totalCents: number;
  currency: string;
  commissionCount: number;
  periodYear: number;
  periodMonth: number;
}): string {
  const periodLabel = `${MONTH_NAMES[params.periodMonth - 1]} ${params.periodYear}`;
  return shellHtml(
    "Uitbetaling onderweg",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">Voor periode <strong>${periodLabel}</strong> wordt vandaag <strong>${formatAmount(params.totalCents, params.currency)}</strong> aan je uitbetaald, over <strong>${params.commissionCount} commissies</strong>.</p>
    <p style="margin:0 0 14px 0;">Het bedrag staat binnen 5 werkdagen op de rekening die je bij je payout-gegevens hebt opgegeven.</p>
    ${cta(`${emailBase()}/affiliate/dashboard`, "Bekijk overzicht in dashboard")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Heb je payout-gegevens niet doorgegeven? Antwoord op deze mail, dan regelen we het.</p>`,
  );
}

function payoutScheduledText(params: {
  name?: string;
  totalCents: number;
  currency: string;
  commissionCount: number;
  periodYear: number;
  periodMonth: number;
}): string {
  const periodLabel = `${MONTH_NAMES[params.periodMonth - 1]} ${params.periodYear}`;
  return [
    greet(params.name),
    "",
    `Voor periode ${periodLabel} wordt vandaag ${formatAmount(params.totalCents, params.currency)} aan je uitbetaald`,
    `(over ${params.commissionCount} commissies).`,
    "",
    "Het bedrag staat binnen 5 werkdagen op de rekening die je hebt opgegeven.",
    "",
    `Dashboard: ${emailBase()}/affiliate/dashboard`,
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 4. Payout uitbetaald bevestiging ───────────────────────────

export async function sendAffiliatePayoutPaidEmail(params: {
  to: string;
  name?: string;
  totalCents: number;
  currency: string;
  sepaBatchRef?: string;
  periodYear: number;
  periodMonth: number;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Uitbetaling verwerkt: ${formatAmount(params.totalCents, params.currency)}`,
    html: payoutPaidHtml(params),
    text: payoutPaidText(params),
    tags: [{ name: "category", value: "affiliate_payout_paid" }],
    log: { category: "affiliate_payout_paid", userId: params.userId ?? null },
  });
}

function payoutPaidHtml(params: {
  name?: string;
  totalCents: number;
  currency: string;
  sepaBatchRef?: string;
  periodYear: number;
  periodMonth: number;
}): string {
  const periodLabel = `${MONTH_NAMES[params.periodMonth - 1]} ${params.periodYear}`;
  return shellHtml(
    "Uitbetaling verwerkt",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">Je uitbetaling voor <strong>${periodLabel}</strong> is verwerkt: <strong>${formatAmount(params.totalCents, params.currency)}</strong>.</p>
    ${params.sepaBatchRef ? `<p style="margin:0 0 14px 0;font-size:14px;color:${BRAND.textMuted};">Bankreferentie: <span style="font-family:monospace">${params.sepaBatchRef}</span></p>` : ""}
    <p style="margin:0 0 14px 0;">Bedankt voor je bijdrage. Tot de volgende maand.</p>
    ${cta(`${emailBase()}/affiliate/dashboard`, "Dashboard")}`,
  );
}

function payoutPaidText(params: {
  name?: string;
  totalCents: number;
  currency: string;
  sepaBatchRef?: string;
  periodYear: number;
  periodMonth: number;
}): string {
  const periodLabel = `${MONTH_NAMES[params.periodMonth - 1]} ${params.periodYear}`;
  return [
    greet(params.name),
    "",
    `Je uitbetaling voor ${periodLabel} is verwerkt: ${formatAmount(params.totalCents, params.currency)}.`,
    params.sepaBatchRef ? `Bankreferentie: ${params.sepaBatchRef}` : "",
    "",
    "Bedankt voor je bijdrage. Tot de volgende maand.",
    "",
    `Dashboard: ${emailBase()}/affiliate/dashboard`,
    "",
    "Dicteren.ai",
  ]
    .filter(Boolean)
    .join("\n");
}
