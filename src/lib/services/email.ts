// Dicteren.ai — Email Service (Resend)
// Shared mechanics: send transactional emails via Resend SDK.
// Domain logic (when/why to send) stays in actions.
// Source-of-truth: .claude/skills/resend-integration.md

import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";
import type { ServiceResult } from "@/lib/types";
import { appBase } from "@/lib/url";

const DEFAULT_FROM = "Dicteren.ai <licenties@dicteren.ai>";
const DEFAULT_REPLY_TO = "info@dicteren.ai";
const MAX_RETRY_ATTEMPTS = 4;

export type EmailCategory =
  | "license_issued"
  | "welcome"
  | "subscription_past_due"
  | "subscription_canceled"
  | "subscription_renewed"
  | "refund"
  | "trial_started"
  | "trial_reminder_d7"
  | "trial_reminder_d13"
  | "trial_expired"
  | "other";

interface EmailLogContext {
  category: EmailCategory;
  userId?: string | null;
  orderId?: string | null;
  licenseId?: string | null;
  subscriptionId?: string | null;
}

let cached: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

function fromAddress(): string {
  const env = process.env.RESEND_FROM_EMAIL;
  if (!env) return DEFAULT_FROM;
  return env.includes("<") ? env : `Dicteren.ai <${env}>`;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  idempotencyKey?: string;
  /** Audit context — emitted to email_logs for admin visibility. */
  log: EmailLogContext;
}

interface SendResult {
  id: string;
}

function firstRecipient(to: string | string[]): string {
  return Array.isArray(to) ? (to[0] ?? "") : to;
}

async function writeLog(args: {
  ctx: EmailLogContext;
  to: string;
  subject: string;
  idempotencyKey?: string;
  status: "sent" | "failed";
  resendId?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
}) {
  try {
    await db.insert(emailLogs).values({
      resendId: args.resendId ?? null,
      toAddress: args.to,
      fromAddress: fromAddress(),
      subject: args.subject,
      category: args.ctx.category,
      status: args.status,
      errorMessage: args.errorMessage ?? null,
      errorCode: args.errorCode ?? null,
      idempotencyKey: args.idempotencyKey ?? null,
      userId: args.ctx.userId ?? null,
      orderId: args.ctx.orderId ?? null,
      licenseId: args.ctx.licenseId ?? null,
      subscriptionId: args.ctx.subscriptionId ?? null,
    });
  } catch (err) {
    // Logging must never break the send-flow.
    console.warn("[email_logs] insert failed", (err as Error).message);
  }
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<ServiceResult<SendResult>> {
  const recipient = firstRecipient(params.to);
  const resend = client();
  if (!resend) {
    await writeLog({
      ctx: params.log,
      to: recipient,
      subject: params.subject,
      idempotencyKey: params.idempotencyKey,
      status: "failed",
      errorMessage: "Resend API key ontbreekt",
      errorCode: "EMAIL_NOT_CONFIGURED",
    });
    return {
      success: false,
      error: "Resend API key ontbreekt",
      code: "EMAIL_NOT_CONFIGURED",
    };
  }

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    const { data, error } = await resend.emails.send(
      {
        from: fromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo ?? DEFAULT_REPLY_TO,
        tags: params.tags,
      },
      params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : undefined,
    );

    if (!error && data) {
      await writeLog({
        ctx: params.log,
        to: recipient,
        subject: params.subject,
        idempotencyKey: params.idempotencyKey,
        status: "sent",
        resendId: data.id,
      });
      return { success: true, data: { id: data.id } };
    }

    const statusCode = (error as { statusCode?: number } | null)?.statusCode;
    if (statusCode === 429 && attempt < MAX_RETRY_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
      continue;
    }

    const code =
      statusCode === 429
        ? "EMAIL_RATE_LIMITED"
        : statusCode && statusCode >= 400 && statusCode < 500
          ? "EMAIL_VALIDATION_ERROR"
          : "EMAIL_NETWORK_ERROR";

    await writeLog({
      ctx: params.log,
      to: recipient,
      subject: params.subject,
      idempotencyKey: params.idempotencyKey,
      status: "failed",
      errorMessage: error?.message ?? "Onbekende Resend-fout",
      errorCode: code,
    });

    return {
      success: false,
      error: error?.message ?? "Onbekende Resend-fout",
      code,
    };
  }

  await writeLog({
    ctx: params.log,
    to: recipient,
    subject: params.subject,
    idempotencyKey: params.idempotencyKey,
    status: "failed",
    errorMessage: "Maximum retries bereikt",
    errorCode: "EMAIL_RATE_LIMITED",
  });

  return {
    success: false,
    error: "Maximum retries bereikt",
    code: "EMAIL_RATE_LIMITED",
  };
}

// ───── Format helpers ──────────────────────────────────────────────

function formatDateNL(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

// ───── License code (sent after successful payment) ────────────────

export async function sendLicenseEmail(params: {
  to: string;
  name?: string;
  licenseCode: string;
  expiresAt: Date | null;
  orderId?: string;
  licenseId?: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je Dicteren.ai licentie",
    html: licenseEmailHtml(params),
    text: licenseEmailText(params),
    tags: [
      { name: "category", value: "license_issued" },
      ...(params.orderId ? [{ name: "order_id", value: params.orderId }] : []),
    ],
    idempotencyKey: params.orderId ? `license-issued/${params.orderId}` : undefined,
    log: {
      category: "license_issued",
      userId: params.userId ?? null,
      orderId: params.orderId ?? null,
      licenseId: params.licenseId ?? null,
    },
  });
}

// ───── Welcome (after sign-up) ─────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to: string;
  name?: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Welkom bij Dicteren.ai",
    html: welcomeEmailHtml(params),
    text: `Welkom${params.name ? ` ${params.name}` : ""}! Bedankt voor je registratie. Vragen? Mail info@dicteren.ai.`,
    tags: [{ name: "category", value: "welcome" }],
    idempotencyKey: params.userId ? `welcome/${params.userId}` : undefined,
    log: { category: "welcome", userId: params.userId ?? null },
  });
}

// ───── Past due (recurring charge failed; 14-day grace started) ────

export async function sendPastDueEmail(params: {
  to: string;
  name?: string;
  graceUntil: Date;
  subscriptionId: string;
  licenseId?: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je betaling is mislukt",
    html: pastDueEmailHtml(params),
    text: pastDueEmailText(params),
    tags: [
      { name: "category", value: "subscription_past_due" },
      { name: "subscription_id", value: params.subscriptionId },
    ],
    idempotencyKey: `subscription-past-due/${params.subscriptionId}/${params.graceUntil.toISOString().slice(0, 10)}`,
    log: {
      category: "subscription_past_due",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
      subscriptionId: params.subscriptionId,
    },
  });
}

// ───── Cancel confirmation (user opted out via /account/billing) ───

export async function sendCancelEmail(params: {
  to: string;
  name?: string;
  expiresAt: Date | null;
  subscriptionId: string;
  licenseId?: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je abonnement is opgezegd",
    html: cancelEmailHtml(params),
    text: cancelEmailText(params),
    tags: [
      { name: "category", value: "subscription_canceled" },
      { name: "subscription_id", value: params.subscriptionId },
    ],
    idempotencyKey: `subscription-canceled/${params.subscriptionId}`,
    log: {
      category: "subscription_canceled",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
      subscriptionId: params.subscriptionId,
    },
  });
}

// ───── Refund confirmation ─────────────────────────────────────────

export async function sendRefundEmail(params: {
  to: string;
  name?: string;
  amountCents: number;
  currency: string;
  orderId: string;
  licenseId?: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je terugbetaling is in behandeling",
    html: refundEmailHtml(params),
    text: refundEmailText(params),
    tags: [
      { name: "category", value: "refund" },
      { name: "order_id", value: params.orderId },
    ],
    idempotencyKey: `refund/${params.orderId}`,
    log: {
      category: "refund",
      userId: params.userId ?? null,
      orderId: params.orderId,
      licenseId: params.licenseId ?? null,
    },
  });
}

// ───── Renewal success ─────────────────────────────────────────────

export async function sendRenewalEmail(params: {
  to: string;
  name?: string;
  amountCents: number;
  currency: string;
  newExpiresAt: Date;
  subscriptionId: string;
  paymentId: string;
  licenseId?: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je abonnement is verlengd",
    html: renewalEmailHtml(params),
    text: renewalEmailText(params),
    tags: [
      { name: "category", value: "subscription_renewed" },
      { name: "subscription_id", value: params.subscriptionId },
    ],
    idempotencyKey: `subscription-renewed/${params.paymentId}`,
    log: {
      category: "subscription_renewed",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
      subscriptionId: params.subscriptionId,
    },
  });
}

// ───── Templates — Dicteren.ai branding ───────────────────────────
//
// Brand tokens (gespiegeld uit globals.css):
//   --navy   #042660  primary, header background + link color
//   --orange #FF8441  CTA color
//   --bg     #F7F7F4  email-shell achtergrond
//
// Email-clients zoals Gmail/Outlook strippen <style>-blocks — alle
// styling is inline. Max-width 600px voor mobile-fit.

const BRAND = {
  navy: "#042660",
  navyLink: "#0b3478",
  orange: "#FF8441",
  orangeHover: "#ec6c1f",
  text: "#1a1f33",
  textMuted: "#5a6478",
  textSoft: "#8d97a8",
  border: "#e5e7ec",
  bg: "#f7f7f4",
  white: "#ffffff",
  codeBg: "#f4f6fb",
} as const;

const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function logoUrl(): string {
  // Absolute URL vereist door e-mail clients (geen relatieve paths).
  return `${appBase()}/email/logo.png`;
}

function shellHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${EMAIL_FONT};color:${BRAND.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.white};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(4,38,96,0.06);">
          <tr>
            <td style="background:${BRAND.navy};padding:24px 32px;">
              <img src="${logoUrl()}" alt="Dicteren.ai" width="160" style="display:block;height:auto;border:0;outline:none;text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <h1 style="margin:0 0 20px 0;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.navy};letter-spacing:-0.01em;">${title}</h1>
              <div style="font-size:15px;line-height:1.6;color:${BRAND.text};">
                ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0 0 6px 0;font-size:13px;color:${BRAND.textMuted};">
                Vragen? Mail <a href="mailto:info@dicteren.ai" style="color:${BRAND.navyLink};text-decoration:underline;">info@dicteren.ai</a>.
              </p>
              <p style="margin:0;font-size:12px;color:${BRAND.textSoft};">
                Dicteren.ai · Lokaal dicteren in het Nederlands ·
                <a href="${appBase()}" style="color:${BRAND.textSoft};text-decoration:underline;">dicteren.ai</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:${BRAND.textSoft};text-align:center;">
          Je krijgt deze mail omdat je een Dicteren.ai-account hebt.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Brand-CTA button — orange achtergrond + witte tekst. Eén styling-bron. */
function cta(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND.orange};border-radius:10px;">
        <a href="${href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;letter-spacing:0.01em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Brand-link — navy met underline. */
function brandLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${BRAND.navyLink};text-decoration:underline;">${label}</a>`;
}

/** Licentiecode display block — mono font + brand-card styling. */
function codeBlock(code: string): string {
  return `<div style="background:${BRAND.codeBg};border:1px solid ${BRAND.border};border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
    <div style="font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:0.04em;color:${BRAND.navy};">${code}</div>
  </div>`;
}

function greet(name?: string): string {
  return name ? `Hallo ${name},` : "Hallo,";
}

function licenseEmailHtml(params: {
  name?: string;
  licenseCode: string;
  expiresAt: Date | null;
}): string {
  const expiry = params.expiresAt
    ? `Geldig tot ${formatDateNL(params.expiresAt)}.`
    : "Geen vervaldatum — lifetime licentie.";
  return shellHtml(
    "Je licentie staat klaar",
    `<p style="margin:0 0 12px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 8px 0;">Bedankt voor je aankoop. Je licentiecode:</p>
  ${codeBlock(params.licenseCode)}
  <p style="margin:0 0 20px 0;font-size:13px;color:${BRAND.textMuted};">${expiry}</p>
  ${cta(`${appBase()}/download`, "Download Dicteren.ai")}
  <p style="margin:0 0 8px 0;">Activeren in 3 stappen:</p>
  <ol style="margin:0 0 12px 20px;padding:0;color:${BRAND.text};">
    <li style="margin-bottom:4px;">Download de app via ${brandLink(`${appBase()}/download`, "dicteren.ai/download")}</li>
    <li style="margin-bottom:4px;">Open de app — je krijgt direct het activatiescherm</li>
    <li>Plak je code hierboven en je bent klaar</li>
  </ol>`,
  );
}

function licenseEmailText(params: {
  name?: string;
  licenseCode: string;
  expiresAt: Date | null;
}): string {
  return [
    greet(params.name),
    "",
    "Bedankt voor je aankoop. Hier is je licentiecode:",
    "",
    params.licenseCode,
    "",
    params.expiresAt
      ? `Geldig tot ${formatDateNL(params.expiresAt)}.`
      : "Geen vervaldatum.",
    "",
    "Stappen om te starten:",
    "1. Download Dicteren.ai op https://dicteren.ai/download",
    "2. Open de app — je krijgt direct het activatiescherm",
    "3. Plak je licentiecode",
    "",
    "Vragen? Mail info@dicteren.ai",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function welcomeEmailHtml(params: { name?: string }): string {
  return shellHtml(
    "Welkom bij Dicteren.ai",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Bedankt voor je registratie. Klaar om aan de slag te gaan?</p>
  ${cta(`${appBase()}/prijzen`, "Bekijk de prijzen")}
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Of probeer eerst 14 dagen gratis via ${brandLink(`${appBase()}/trial/start`, "trial/start")}.</p>`,
  );
}

function pastDueEmailHtml(params: { name?: string; graceUntil: Date }): string {
  return shellHtml(
    "Je laatste betaling is mislukt",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">De automatische afschrijving voor je Dicteren.ai-abonnement is mislukt. Mollie probeert het de komende dagen automatisch opnieuw.</p>
  <p style="margin:0 0 8px 0;"><strong>Wat dit voor jou betekent:</strong></p>
  <ul style="margin:0 0 16px 20px;padding:0;">
    <li style="margin-bottom:4px;">Je app blijft werken tot <strong>${formatDateNL(params.graceUntil)}</strong>.</li>
    <li>Daarna wordt Dicteren.ai vergrendeld tot je je betaalgegevens hebt bijgewerkt.</li>
  </ul>
  ${cta(`${appBase()}/account/billing`, "Werk je betaalgegevens bij")}
  <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Heb je dit al opgelost? Dan kun je deze mail negeren.</p>`,
  );
}

function pastDueEmailText(params: { name?: string; graceUntil: Date }): string {
  return [
    greet(params.name),
    "",
    "De automatische afschrijving voor je Dicteren.ai-abonnement is mislukt.",
    "Mollie probeert het automatisch opnieuw in de komende dagen.",
    "",
    `Je app blijft werken tot ${formatDateNL(params.graceUntil)}.`,
    "Daarna wordt Dicteren.ai gelocked tot je je betaalgegevens hebt bijgewerkt.",
    "",
    "Werk je betaalgegevens bij: https://dicteren.ai/account/billing",
    "",
    "Vragen? Mail info@dicteren.ai",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function cancelEmailHtml(params: {
  name?: string;
  expiresAt: Date | null;
}): string {
  const tail = params.expiresAt
    ? `Je toegang loopt door tot <strong>${formatDateNL(params.expiresAt)}</strong>. Daarna stopt Dicteren.ai met werken.`
    : `Je abonnement is meteen opgezegd.`;
  return shellHtml(
    "Je abonnement is opgezegd",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">We hebben je opzegging ontvangen. ${tail}</p>
  <p style="margin:0 0 18px 0;">Je instellingen en geschiedenis blijven bewaard — je kunt op elk moment terugkeren.</p>
  ${cta(`${appBase()}/prijzen`, "Bekijk de prijzen")}
  <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Verkeerd opgezegd? Antwoord op deze mail — we helpen je verder.</p>`,
  );
}

function cancelEmailText(params: {
  name?: string;
  expiresAt: Date | null;
}): string {
  const tail = params.expiresAt
    ? `Je toegang loopt door tot ${formatDateNL(params.expiresAt)}. Daarna stopt Dicteren.ai met werken.`
    : `Je abonnement is meteen opgezegd.`;
  return [
    greet(params.name),
    "",
    `We hebben je opzegging ontvangen. ${tail}`,
    "",
    "Je instellingen en geschiedenis blijven bewaard.",
    "Terug abonneren: https://dicteren.ai/prijzen",
    "",
    "Verkeerd opgezegd? Mail info@dicteren.ai",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function refundEmailHtml(params: {
  name?: string;
  amountCents: number;
  currency: string;
  orderId: string;
}): string {
  return shellHtml(
    "Je terugbetaling is in behandeling",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">We hebben een terugbetaling van <strong>${formatAmount(params.amountCents, params.currency)}</strong> in gang gezet voor order <code style="font-family:'SF Mono',Menlo,monospace;background:${BRAND.codeBg};padding:2px 6px;border-radius:4px;font-size:13px;">${params.orderId.slice(0, 8)}…</code>.</p>
  <p style="margin:0 0 14px 0;">Het geld staat binnen <strong>1-5 werkdagen</strong> terug op de rekening waarmee je hebt betaald.</p>
  <p style="margin:0 0 14px 0;">Je Dicteren.ai-licentie is meteen ingetrokken — de app vraagt bij de volgende start om een nieuwe code.</p>
  <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Klopt iets niet? Antwoord op deze mail.</p>`,
  );
}

function refundEmailText(params: {
  name?: string;
  amountCents: number;
  currency: string;
  orderId: string;
}): string {
  return [
    greet(params.name),
    "",
    `We hebben een terugbetaling van ${formatAmount(params.amountCents, params.currency)} in gang gezet voor order ${params.orderId.slice(0, 8)}…`,
    "",
    "Het geld staat binnen 1-5 werkdagen terug op de rekening waarmee je hebt betaald.",
    "",
    "Je licentie is meteen ingetrokken — de app vraagt bij de volgende start om een nieuwe code.",
    "",
    "Vragen? Mail info@dicteren.ai",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function renewalEmailHtml(params: {
  name?: string;
  amountCents: number;
  currency: string;
  newExpiresAt: Date;
}): string {
  return shellHtml(
    "Je abonnement is verlengd",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">We hebben <strong>${formatAmount(params.amountCents, params.currency)}</strong> afgeschreven voor de verlenging van je Dicteren.ai-abonnement.</p>
  <p style="margin:0 0 18px 0;">Je toegang loopt nu door tot <strong>${formatDateNL(params.newExpiresAt)}</strong>.</p>
  ${cta(`${appBase()}/account/billing`, "Beheer je abonnement")}
  <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Een factuur volgt apart per mail.</p>`,
  );
}

function renewalEmailText(params: {
  name?: string;
  amountCents: number;
  currency: string;
  newExpiresAt: Date;
}): string {
  return [
    greet(params.name),
    "",
    `We hebben ${formatAmount(params.amountCents, params.currency)} afgeschreven voor de verlenging van je Dicteren.ai-abonnement.`,
    `Je toegang loopt nu door tot ${formatDateNL(params.newExpiresAt)}.`,
    "",
    "Beheer je abonnement: https://dicteren.ai/account/billing",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── Trial: kick-off (after web sign-up + claim) ─────────────────

export async function sendTrialStartedEmail(params: {
  to: string;
  name?: string;
  licenseCode: string;
  expiresAt: Date;
  userId?: string;
  licenseId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je 14 dagen Dicteren.ai zijn begonnen",
    html: trialStartedHtml(params),
    text: trialStartedText(params),
    tags: [
      { name: "category", value: "trial_started" },
      ...(params.licenseId ? [{ name: "license_id", value: params.licenseId }] : []),
    ],
    idempotencyKey: params.licenseId ? `trial-started/${params.licenseId}` : undefined,
    log: {
      category: "trial_started",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
    },
  });
}

// ───── Trial: day-7 reminder ───────────────────────────────────────

export async function sendTrialReminderD7Email(params: {
  to: string;
  name?: string;
  daysLeft: number;
  expiresAt: Date;
  userId?: string;
  licenseId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Hoe bevalt Dicteren.ai?",
    html: trialReminderD7Html(params),
    text: trialReminderD7Text(params),
    tags: [
      { name: "category", value: "trial_reminder_d7" },
      ...(params.licenseId ? [{ name: "license_id", value: params.licenseId }] : []),
    ],
    idempotencyKey: params.licenseId ? `trial-reminder-d7/${params.licenseId}` : undefined,
    log: {
      category: "trial_reminder_d7",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
    },
  });
}

// ───── Trial: day-13 final reminder ────────────────────────────────

export async function sendTrialReminderD13Email(params: {
  to: string;
  name?: string;
  expiresAt: Date;
  userId?: string;
  licenseId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je proefperiode verloopt morgen",
    html: trialReminderD13Html(params),
    text: trialReminderD13Text(params),
    tags: [
      { name: "category", value: "trial_reminder_d13" },
      ...(params.licenseId ? [{ name: "license_id", value: params.licenseId }] : []),
    ],
    idempotencyKey: params.licenseId ? `trial-reminder-d13/${params.licenseId}` : undefined,
    log: {
      category: "trial_reminder_d13",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
    },
  });
}

// ───── Trial: expired (day 14+) ────────────────────────────────────

export async function sendTrialExpiredEmail(params: {
  to: string;
  name?: string;
  userId?: string;
  licenseId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Je proefperiode is voorbij",
    html: trialExpiredHtml(params),
    text: trialExpiredText(params),
    tags: [
      { name: "category", value: "trial_expired" },
      ...(params.licenseId ? [{ name: "license_id", value: params.licenseId }] : []),
    ],
    idempotencyKey: params.licenseId ? `trial-expired/${params.licenseId}` : undefined,
    log: {
      category: "trial_expired",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
    },
  });
}

// ───── Trial templates ─────────────────────────────────────────────

function trialStartedHtml(params: {
  name?: string;
  licenseCode: string;
  expiresAt: Date;
}): string {
  return shellHtml(
    "Je 14 dagen Dicteren.ai zijn begonnen",
    `<p style="margin:0 0 12px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 12px 0;">Je proefperiode is geactiveerd tot en met <strong>${formatDateNL(params.expiresAt)}</strong>.</p>
  <p style="margin:0 0 8px 0;">Hier is je code voor de desktop-app:</p>
  ${codeBlock(params.licenseCode)}
  ${cta(`${appBase()}/download`, "Download Dicteren.ai")}
  <p style="margin:0 0 8px 0;">Activeren in 3 stappen:</p>
  <ol style="margin:0 0 12px 20px;padding:0;color:${BRAND.text};">
    <li style="margin-bottom:4px;">Download via ${brandLink(`${appBase()}/download?utm_source=trial_start_email`, "dicteren.ai/download")}</li>
    <li style="margin-bottom:4px;">Open de app — je krijgt direct het activatiescherm</li>
    <li>Plak je code en je bent klaar</li>
  </ol>
  <p style="margin:14px 0 0 0;font-size:13px;color:${BRAND.textMuted};">Tip: probeer de eerste dagen verschillende programma's — Outlook, Word, browser. Zo merk je waar Dicteren.ai het verschil maakt.</p>`,
  );
}

function trialStartedText(params: {
  name?: string;
  licenseCode: string;
  expiresAt: Date;
}): string {
  return [
    greet(params.name),
    "",
    `Je proefperiode is geactiveerd tot en met ${formatDateNL(params.expiresAt)}.`,
    "",
    "Je code:",
    params.licenseCode,
    "",
    "Stappen om te starten:",
    "1. Download Dicteren.ai op https://dicteren.ai/download",
    "2. Open de app — activatiescherm verschijnt direct",
    "3. Plak je code hierboven",
    "",
    "Tip: probeer Dicteren.ai de eerste dagen in verschillende programma's.",
    "",
    "Vragen? Mail info@dicteren.ai",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function trialReminderD7Html(params: {
  name?: string;
  daysLeft: number;
  expiresAt: Date;
}): string {
  return shellHtml(
    "Hoe bevalt Dicteren.ai?",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je gebruikt Dicteren.ai nu een week. Nog <strong>${params.daysLeft} dagen</strong> in je proefperiode (tot ${formatDateNL(params.expiresAt)}).</p>
  <p style="margin:0 0 8px 0;">Werkt het zoals je hoopte? Neem dan een licentie en blijf doorgaan:</p>
  ${cta(`${appBase()}/prijzen?utm_source=trial_d7_email`, "Bekijk de prijzen")}
  <p style="margin:0 0 14px 0;">Vanaf <strong>€12 per maand</strong> of <strong>€96 per jaar</strong>. Geen verborgen kosten, opzeggen wanneer je wilt.</p>
  <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Werkt iets niet goed? Antwoord op deze mail — we lossen het op.</p>`,
  );
}

function trialReminderD7Text(params: {
  name?: string;
  daysLeft: number;
  expiresAt: Date;
}): string {
  return [
    greet(params.name),
    "",
    `Je gebruikt Dicteren.ai een week. Nog ${params.daysLeft} dagen in je proefperiode (tot ${formatDateNL(params.expiresAt)}).`,
    "",
    "Werkt het zoals je hoopte? Neem dan een licentie en blijf doorgaan:",
    "https://dicteren.ai/prijzen",
    "",
    "Vanaf €12 per maand. Opzeggen wanneer je wilt.",
    "",
    "Werkt iets niet goed? Stuur een mail terug — we lossen het op.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function trialReminderD13Html(params: {
  name?: string;
  expiresAt: Date;
}): string {
  return shellHtml(
    "Je proefperiode verloopt morgen",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je proefperiode loopt af op <strong>${formatDateNL(params.expiresAt)}</strong>. Dat is morgen.</p>
  <p style="margin:0 0 8px 0;">Koop nu een licentie zodat je app door blijft werken — geen onderbreking, geen nieuwe code, geen gedoe.</p>
  ${cta(`${appBase()}/prijzen?utm_source=trial_d13_email`, "Kies een licentie")}
  <ul style="margin:0 0 14px 20px;padding:0;">
    <li style="margin-bottom:4px;"><strong>€12/maand</strong> — flexibel, opzeggen wanneer je wilt</li>
    <li style="margin-bottom:4px;"><strong>€30/kwartaal</strong> — 17% korting</li>
    <li><strong>€96/jaar</strong> — 33% korting, twee maanden gratis</li>
  </ul>
  <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Vragen? Antwoord op deze mail — we beantwoorden dezelfde dag.</p>`,
  );
}

function trialReminderD13Text(params: {
  name?: string;
  expiresAt: Date;
}): string {
  return [
    greet(params.name),
    "",
    `Je proefperiode van Dicteren.ai loopt af op ${formatDateNL(params.expiresAt)}. Dat is morgen.`,
    "",
    "Koop nu een licentie zodat je app door kan blijven werken:",
    "https://dicteren.ai/prijzen",
    "",
    "Opties:",
    "- €12/maand — flexibel, opzeggen wanneer je wilt",
    "- €30/kwartaal — 17% korting",
    "- €96/jaar — 33% korting, twee maanden gratis",
    "",
    "Vragen? Mail info@dicteren.ai",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function trialExpiredHtml(params: { name?: string }): string {
  return shellHtml(
    "Je proefperiode is voorbij",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je 14-dagen proefperiode is afgelopen. De app vraagt nu om een licentie voor je verder kunt.</p>
  <p style="margin:0 0 14px 0;">Je instellingen en geschiedenis blijven gewoon bewaard — koop een licentie en je gaat verder waar je gebleven was.</p>
  ${cta(`${appBase()}/prijzen?utm_source=trial_expired_email`, "Kies een licentie")}
  <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Feedback waarom je nog niet kiest? Antwoord gerust — we lezen elke reactie.</p>`,
  );
}

function trialExpiredText(params: { name?: string }): string {
  return [
    greet(params.name),
    "",
    "Je 14-dagen proefperiode van Dicteren.ai is afgelopen.",
    "De app vraagt nu om een licentie voor je verder kunt.",
    "",
    "Je instellingen en geschiedenis blijven bewaard — koop een licentie en je gaat verder.",
    "",
    "https://dicteren.ai/prijzen",
    "",
    "Hulp nodig of feedback? Antwoord op deze mail.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── Auth: password-reset / email-verification / org-invite ──────

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string;
  resetUrl: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Stel een nieuw wachtwoord in voor Dicteren.ai",
    html: passwordResetHtml(params),
    text: passwordResetText(params),
    tags: [{ name: "category", value: "auth_password_reset" }],
    log: { category: "other", userId: params.userId ?? null },
  });
}

export async function sendEmailVerificationEmail(params: {
  to: string;
  name?: string;
  verifyUrl: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: "Bevestig je e-mailadres voor Dicteren.ai",
    html: emailVerificationHtml(params),
    text: emailVerificationText(params),
    tags: [{ name: "category", value: "auth_email_verify" }],
    log: { category: "other", userId: params.userId ?? null },
  });
}

export async function sendOrganizationInviteEmail(params: {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Uitnodiging voor ${params.organizationName} op Dicteren.ai`,
    html: organizationInviteHtml(params),
    text: organizationInviteText(params),
    tags: [{ name: "category", value: "auth_org_invite" }],
    log: { category: "other" },
  });
}

/** Welkomstmail voor nieuwe staff (admin of account_manager). Bevat set-
 *  password-link plus uitleg over /admin login. */
export async function sendStaffWelcomeEmail(params: {
  to: string;
  name?: string;
  role: "admin" | "account_manager";
  setPasswordUrl: string;
  adminUrl: string;
  hasLifetime?: boolean;
  inviterName?: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  const roleLabel =
    params.role === "admin" ? "Admin" : "Account Manager";
  return sendEmail({
    to: params.to,
    subject: `Welkom bij het Dicteren.ai-team (${roleLabel})`,
    html: staffWelcomeHtml(params, roleLabel),
    text: staffWelcomeText(params, roleLabel),
    tags: [{ name: "category", value: "staff_welcome" }],
    log: { category: "other", userId: params.userId ?? null },
  });
}

// ───── Auth: HTML/text templates ───────────────────────────────────

function staffWelcomeHtml(
  params: {
    name?: string;
    role: "admin" | "account_manager";
    setPasswordUrl: string;
    adminUrl: string;
    hasLifetime?: boolean;
    inviterName?: string;
  },
  roleLabel: string,
): string {
  return shellHtml(
    `Welkom bij het Dicteren.ai-team`,
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">
      ${params.inviterName ? `${params.inviterName} heeft je` : "Je bent"}
      toegevoegd aan het Dicteren.ai-team als <strong>${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 4px 0;">Stel eerst je eigen wachtwoord in. De link werkt <strong>24 uur</strong>.</p>
    ${cta(params.setPasswordUrl, "Stel je wachtwoord in")}
    <p style="margin:0 0 8px 0;font-size:14px;">Daarna log je in op het admin-dashboard:</p>
    <p style="margin:0 0 18px 0;font-size:14px;">${brandLink(params.adminUrl, params.adminUrl)}</p>
    ${
      params.hasLifetime
        ? `<p style="margin:0 0 14px 0;font-size:13px;color:${BRAND.textMuted};">Je hebt automatisch lifetime-toegang gekregen voor persoonlijk gebruik van de Dicteren.ai-app.</p>`
        : ""
    }
    <p style="margin:0 0 8px 0;font-size:13px;color:${BRAND.textMuted};">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.setPasswordUrl}</p>
    <p style="margin:0;font-size:13px;color:${BRAND.textSoft};">Vragen? Mail info@dicteren.ai${params.inviterName ? ` of vraag ${params.inviterName}` : ""}.</p>`,
  );
}

function staffWelcomeText(
  params: {
    name?: string;
    role: "admin" | "account_manager";
    setPasswordUrl: string;
    adminUrl: string;
    hasLifetime?: boolean;
    inviterName?: string;
  },
  roleLabel: string,
): string {
  return [
    greet(params.name),
    "",
    `${params.inviterName ? `${params.inviterName} heeft je` : "Je bent"} toegevoegd aan het Dicteren.ai-team als ${roleLabel}.`,
    "",
    "Stel eerst je eigen wachtwoord in (link werkt 24 uur):",
    params.setPasswordUrl,
    "",
    `Daarna log je in op: ${params.adminUrl}`,
    "",
    params.hasLifetime
      ? "Je hebt automatisch lifetime-toegang gekregen voor persoonlijk gebruik."
      : "",
    "",
    "Vragen? info@dicteren.ai",
    "",
    "Dicteren.ai",
  ]
    .filter(Boolean)
    .join("\n");
}

function passwordResetHtml(params: { name?: string; resetUrl: string }): string {
  return shellHtml(
    "Stel een nieuw wachtwoord in",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">Je hebt een aanvraag gedaan om je wachtwoord voor Dicteren.ai opnieuw in te stellen.</p>
    <p style="margin:0 0 4px 0;">Klik op de knop hieronder. De link werkt <strong>1 uur</strong>.</p>
    ${cta(params.resetUrl, "Nieuw wachtwoord instellen")}
    <p style="margin:0 0 8px 0;font-size:13px;color:${BRAND.textMuted};">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.resetUrl}</p>
    <p style="margin:0;font-size:13px;color:${BRAND.textSoft};">Geen wachtwoord-herstel aangevraagd? Negeer deze mail — je wachtwoord blijft hetzelfde.</p>`,
  );
}

function passwordResetText(params: { name?: string; resetUrl: string }): string {
  return [
    greet(params.name),
    "",
    "Je hebt een aanvraag gedaan om je wachtwoord voor Dicteren.ai opnieuw in te stellen.",
    "Klik op de link hieronder om een nieuw wachtwoord te kiezen. De link werkt 1 uur.",
    "",
    params.resetUrl,
    "",
    "Heb je geen herstel aangevraagd? Negeer deze mail — je wachtwoord blijft hetzelfde.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function emailVerificationHtml(params: { name?: string; verifyUrl: string }): string {
  return shellHtml(
    "Bevestig je e-mailadres",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 6px 0;">Welkom bij Dicteren.ai. Bevestig je e-mailadres zodat we je belangrijke updates kunnen sturen — denk aan je licentie, facturen en verlengingen.</p>
    ${cta(params.verifyUrl, "Bevestig e-mailadres")}
    <p style="margin:0 0 8px 0;font-size:13px;color:${BRAND.textMuted};">Of plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.verifyUrl}</p>
    <p style="margin:0;font-size:13px;color:${BRAND.textSoft};">Niet door jou aangevraagd? Negeer deze mail.</p>`,
  );
}

function emailVerificationText(params: { name?: string; verifyUrl: string }): string {
  return [
    greet(params.name),
    "",
    "Welkom bij Dicteren.ai. Bevestig je e-mailadres om je account te activeren.",
    "",
    params.verifyUrl,
    "",
    "Niet door jou aangevraagd? Negeer deze mail.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function organizationInviteHtml(params: {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}): string {
  return shellHtml(
    `Uitnodiging voor ${params.organizationName}`,
    `<p style="margin:0 0 14px 0;">Hallo,</p>
    <p style="margin:0 0 14px 0;"><strong>${params.inviterName}</strong> heeft je uitgenodigd voor <strong>${params.organizationName}</strong> op Dicteren.ai.</p>
    ${cta(params.inviteUrl, "Uitnodiging bekijken")}
    <p style="margin:0 0 8px 0;font-size:13px;color:${BRAND.textMuted};">Of plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.inviteUrl}</p>`,
  );
}

function organizationInviteText(params: {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}): string {
  return [
    "Hoi,",
    "",
    `${params.inviterName} heeft je uitgenodigd voor ${params.organizationName} op Dicteren.ai.`,
    "",
    params.inviteUrl,
    "",
    "Dicteren.ai",
  ].join("\n");
}
