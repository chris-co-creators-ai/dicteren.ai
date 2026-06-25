// Dicteren.ai — Email Service (Resend)
// Shared mechanics: send transactional emails via Resend SDK.
// Domain logic (when/why to send) stays in actions.
// Source-of-truth: .claude/skills/resend-integration.md

import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";
import type { ServiceResult } from "@/lib/types";
import { emailBase } from "@/lib/url";
import { amPhone } from "@/lib/config/amSignature";

const DEFAULT_FROM = "Dicteren.ai <licenties@dicteren.ai>";
const DEFAULT_REPLY_TO = "info@dicteren.ai";
const MAX_RETRY_ATTEMPTS = 4;

export type EmailCategory =
  | "license_issued"
  | "welcome"
  | "partner_deck"
  | "subscription_past_due"
  | "subscription_canceled"
  | "subscription_renewed"
  | "refund"
  | "trial_started"
  | "trial_reminder_d7"
  | "trial_reminder_d13"
  | "trial_expired"
  | "org_member_welcome"
  | "org_owner_joined"
  | "org_member_removed"
  | "org_owner_left"
  | "org_invite_reminder"
  | "org_seats_expanded"
  | "org_seats_reduced"
  | "org_tier_changed"
  | "org_device_revoked"
  | "org_subscription_canceled"
  | "affiliate_approved"
  | "affiliate_first_commission"
  | "affiliate_payout_scheduled"
  | "affiliate_payout_paid"
  | "b2b_payment_link"
  | "b2b_welcome_with_codes"
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
  /** Override de afzender. Default: RESEND_FROM_EMAIL / DEFAULT_FROM (licenties@). */
  from?: string;
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
  from?: string;
}) {
  try {
    await db.insert(emailLogs).values({
      resendId: args.resendId ?? null,
      toAddress: args.to,
      fromAddress: args.from ?? fromAddress(),
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
  const from = params.from ?? fromAddress();
  const resend = client();
  if (!resend) {
    await writeLog({
      ctx: params.log,
      from,
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
        from,
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
      from,
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
    subject: "Je licentie staat klaar",
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

// ───── Betaal-link op maat (door een account-manager verstuurd) ─────

export async function sendConsumerPaymentLinkEmail(params: {
  to: string;
  name?: string;
  planLabel: string;
  amountCents: number;
  checkoutUrl: string;
  userId?: string;
  orderId?: string;
}): Promise<ServiceResult<SendResult>> {
  const amount = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(params.amountCents / 100);
  const hi = params.name ? `Hoi ${params.name},` : "Hoi,";
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#0A2A73;line-height:1.5;">
    <p>${hi}</p>
    <p>Hier is je betaal-link voor <strong>Dicteren.ai ${params.planLabel}</strong> (${amount}).</p>
    <p><a href="${params.checkoutUrl}" style="display:inline-block;background:#FF8F43;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Naar de betaling</a></p>
    <p style="font-size:13px;color:#5b6b86;">Na betaling krijg je je licentiecode per mail. Vragen? Mail <a href="mailto:info@dicteren.ai" style="color:#0A2A73;">info@dicteren.ai</a>.</p>
  </div>`;
  const text = `${hi}\n\nHier is je betaal-link voor Dicteren.ai ${params.planLabel} (${amount}):\n${params.checkoutUrl}\n\nNa betaling krijg je je licentiecode per mail. Vragen? info@dicteren.ai`;
  return sendEmail({
    to: params.to,
    subject: `Je betaal-link voor Dicteren.ai ${params.planLabel}`,
    html,
    text,
    tags: [
      { name: "category", value: "other" },
      ...(params.orderId ? [{ name: "order_id", value: params.orderId }] : []),
    ],
    log: {
      category: "other",
      userId: params.userId ?? null,
      orderId: params.orderId ?? null,
    },
  });
}

export async function sendBusinessTrialInviteEmail(params: {
  to: string;
  name?: string;
  trialUrl: string;
}): Promise<ServiceResult<SendResult>> {
  const hi = params.name ? `Hoi ${params.name},` : "Hoi,";
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#0A2A73;line-height:1.5;">
    <p>${hi}</p>
    <p>Je kunt Dicteren.ai 14 dagen gratis zakelijk uitproberen. Vul je bedrijfsgegevens in en je test direct — geen betaling nodig.</p>
    <p><a href="${params.trialUrl}" style="display:inline-block;background:#FF8F43;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Start 14 dagen gratis</a></p>
    <p style="font-size:13px;color:#5b6b86;">Vragen? Mail <a href="mailto:info@dicteren.ai" style="color:#0A2A73;">info@dicteren.ai</a>.</p>
  </div>`;
  const text = `${hi}\n\nProbeer Dicteren.ai 14 dagen gratis zakelijk. Vul je bedrijfsgegevens in en test direct:\n${params.trialUrl}\n\nVragen? info@dicteren.ai`;
  return sendEmail({
    to: params.to,
    subject: "Probeer Dicteren.ai 14 dagen gratis (zakelijk)",
    html,
    text,
    tags: [{ name: "category", value: "other" }],
    log: { category: "other" },
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
    subject: "Betaling mislukt",
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
    subject: "Abonnement opgezegd",
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
    subject: "Terugbetaling in behandeling",
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
    subject: "Abonnement verlengd",
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
// Brand tokens uit globals.css (navy primary, orange CTA, aqua accent).
// Geen em/en dashes in tekst, geen vragen-als-koppen, geen interne
// referenties in body. Voice = website: kort, declaratief, NL.
//
// Email-clients strippen <style>-blocks — alles inline. Outlook negeert
// CSS-gradients en SVG; alleen solid colors + PNG. Max-width 600px.

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
  aquaSoft: "#c4eef0",
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
              <div style="font-size:16px;line-height:1.65;color:${BRAND.text};">
                ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 40px 28px 40px;border-top:1px solid ${BRAND.borderSoft};background:${BRAND.white};">
              <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.textMuted};">
                Vragen of feedback? Mail <a href="mailto:info@dicteren.ai" style="color:${BRAND.navyLink};text-decoration:underline;">info@dicteren.ai</a>.
              </p>
              <p style="margin:0;font-size:12px;color:${BRAND.textSoft};">
                Dicteren.ai, lokaal dicteren in het Nederlands. <a href="${emailBase()}" style="color:${BRAND.textSoft};text-decoration:underline;">dicteren.ai</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0 0;font-size:11px;color:${BRAND.textSoft};text-align:center;">
          Je krijgt deze mail omdat je een Dicteren.ai-account hebt.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** CTA-button. Eén stylingsbron voor alle templates. */
function cta(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND.orange};border-radius:12px;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:${BRAND.white};text-decoration:none;letter-spacing:0.005em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Brand-link, navy met underline. */
function brandLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${BRAND.navyLink};text-decoration:underline;">${label}</a>`;
}

/** Licentiecode display, mono in navy op brand-card. */
function codeBlock(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;">
    <tr>
      <td style="background:${BRAND.codeBg};border:1px solid ${BRAND.border};border-radius:14px;padding:24px;text-align:center;">
        <div style="font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:0.06em;color:${BRAND.navy};">${code}</div>
      </td>
    </tr>
  </table>`;
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
    : "Lifetime licentie. Geen vervaldatum.";
  return shellHtml(
    "Je licentie staat klaar",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 6px 0;">Dit is je code:</p>
  ${codeBlock(params.licenseCode)}
  <p style="margin:0 0 22px 0;font-size:14px;color:${BRAND.textMuted};">${expiry}</p>
  ${cta(`${emailBase()}/download`, "Download de app")}
  <p style="margin:0 0 10px 0;font-weight:700;color:${BRAND.navy};">Zo activeer je:</p>
  <ol style="margin:0;padding:0 0 0 20px;color:${BRAND.text};">
    <li style="margin-bottom:6px;">Download via ${brandLink(`${emailBase()}/download`, "dicteren.ai/download")}.</li>
    <li style="margin-bottom:6px;">Open de app. Het activatiescherm verschijnt meteen.</li>
    <li>Plak je code. Klaar.</li>
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
    "Dit is je code:",
    "",
    params.licenseCode,
    "",
    params.expiresAt
      ? `Geldig tot ${formatDateNL(params.expiresAt)}.`
      : "Lifetime licentie. Geen vervaldatum.",
    "",
    "Zo activeer je:",
    "1. Download via https://www.dicteren.ai/download.",
    "2. Open de app. Het activatiescherm verschijnt meteen.",
    "3. Plak je code. Klaar.",
    "",
    "Vragen? Mail info@dicteren.ai.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function welcomeEmailHtml(params: { name?: string }): string {
  return shellHtml(
    "Welkom bij Dicteren.ai",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Fijn dat je er bent. Praat. En het staat er, in welke app dan ook.</p>
  <p style="margin:0 0 6px 0;">Start meteen met 14 dagen gratis. Geen creditcard nodig.</p>
  ${cta(`${emailBase()}/trial/start`, "Start 14 dagen gratis")}
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Liever direct kopen? Bekijk de ${brandLink(`${emailBase()}/prijzen`, "prijzen")}.</p>`,
  );
}

function pastDueEmailHtml(params: { name?: string; graceUntil: Date }): string {
  return shellHtml(
    "Betaling mislukt",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">De automatische incasso voor je abonnement is mislukt. Mollie probeert het de komende dagen opnieuw.</p>
  <p style="margin:0 0 6px 0;font-weight:700;color:${BRAND.navy};">Wat dit betekent:</p>
  <ul style="margin:0 0 18px 20px;padding:0;">
    <li style="margin-bottom:6px;">Je app blijft gewoon werken tot <strong>${formatDateNL(params.graceUntil)}</strong>.</li>
    <li>Daarna staat de app op slot tot je betaalgegevens kloppen.</li>
  </ul>
  ${cta(`${emailBase()}/account/billing`, "Werk je betaalgegevens bij")}
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Al opgelost? Dan kun je deze mail negeren.</p>`,
  );
}

function pastDueEmailText(params: { name?: string; graceUntil: Date }): string {
  return [
    greet(params.name),
    "",
    "De automatische incasso voor je abonnement is mislukt.",
    "Mollie probeert het de komende dagen opnieuw.",
    "",
    `Je app blijft gewoon werken tot ${formatDateNL(params.graceUntil)}.`,
    "Daarna staat de app op slot tot je betaalgegevens kloppen.",
    "",
    "Werk je betaalgegevens bij: https://www.dicteren.ai/account/billing",
    "",
    "Al opgelost? Dan kun je deze mail negeren.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function cancelEmailHtml(params: {
  name?: string;
  expiresAt: Date | null;
}): string {
  const tail = params.expiresAt
    ? `Je houdt toegang tot <strong>${formatDateNL(params.expiresAt)}</strong>. Daarna stopt de app met werken.`
    : `Je abonnement stopt meteen.`;
  return shellHtml(
    "Abonnement opgezegd",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je opzegging is verwerkt. ${tail}</p>
  <p style="margin:0 0 18px 0;">Je instellingen en geschiedenis blijven bewaard. Kom je terug, dan staat alles nog klaar.</p>
  ${cta(`${emailBase()}/prijzen`, "Bekijk de prijzen")}
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Per ongeluk opgezegd? Antwoord op deze mail, dan zetten we het terug.</p>`,
  );
}

function cancelEmailText(params: {
  name?: string;
  expiresAt: Date | null;
}): string {
  const tail = params.expiresAt
    ? `Je houdt toegang tot ${formatDateNL(params.expiresAt)}. Daarna stopt de app met werken.`
    : `Je abonnement stopt meteen.`;
  return [
    greet(params.name),
    "",
    `Je opzegging is verwerkt. ${tail}`,
    "",
    "Je instellingen en geschiedenis blijven bewaard.",
    "Kom je terug? https://www.dicteren.ai/prijzen",
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
    "Terugbetaling in behandeling",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">We hebben een terugbetaling van <strong>${formatAmount(params.amountCents, params.currency)}</strong> in gang gezet.</p>
  <p style="margin:0 0 14px 0;">Het geld staat binnen 1 tot 5 werkdagen terug op de rekening waarmee je betaald hebt.</p>
  <p style="margin:0 0 14px 0;">Je licentie is per direct ingetrokken. Bij de volgende start vraagt de app om een nieuwe code.</p>
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Klopt iets niet? Antwoord op deze mail.</p>`,
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
    `We hebben een terugbetaling van ${formatAmount(params.amountCents, params.currency)} in gang gezet.`,
    "",
    "Het geld staat binnen 1 tot 5 werkdagen terug op de rekening waarmee je betaald hebt.",
    "",
    "Je licentie is per direct ingetrokken. Bij de volgende start vraagt de app om een nieuwe code.",
    "",
    "Klopt iets niet? Antwoord op deze mail.",
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
    "Abonnement verlengd",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">We hebben <strong>${formatAmount(params.amountCents, params.currency)}</strong> afgeschreven voor je verlenging.</p>
  <p style="margin:0 0 18px 0;">Je toegang loopt nu door tot <strong>${formatDateNL(params.newExpiresAt)}</strong>.</p>
  ${cta(`${emailBase()}/account/billing`, "Beheer abonnement")}
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">De factuur volgt apart per mail.</p>`,
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
    `We hebben ${formatAmount(params.amountCents, params.currency)} afgeschreven voor je verlenging.`,
    `Je toegang loopt nu door tot ${formatDateNL(params.newExpiresAt)}.`,
    "",
    "Beheer je abonnement: https://www.dicteren.ai/account/billing",
    "",
    "De factuur volgt apart per mail.",
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
    subject: "Je 14 dagen zijn begonnen",
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
    subject: "Een week onderweg",
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
    subject: "Morgen loopt je trial af",
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
    "Je 14 dagen zijn begonnen",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je proefperiode loopt tot en met <strong>${formatDateNL(params.expiresAt)}</strong>.</p>
  <p style="margin:0 0 6px 0;">Dit is je code:</p>
  ${codeBlock(params.licenseCode)}
  ${cta(`${emailBase()}/download?utm_source=trial_start_email`, "Download de app")}
  <p style="margin:0 0 10px 0;font-weight:700;color:${BRAND.navy};">Zo activeer je:</p>
  <ol style="margin:0;padding:0 0 0 20px;color:${BRAND.text};">
    <li style="margin-bottom:6px;">Download via ${brandLink(`${emailBase()}/download?utm_source=trial_start_email`, "dicteren.ai/download")}.</li>
    <li style="margin-bottom:6px;">Open de app. Het activatiescherm verschijnt meteen.</li>
    <li>Plak je code. Klaar.</li>
  </ol>
  <p style="margin:18px 0 0 0;font-size:14px;color:${BRAND.textMuted};">Probeer Dicteren.ai de eerste dagen in verschillende programma's: Outlook, Word, je browser. Daar merk je het verschil het snelst.</p>`,
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
    `Je proefperiode loopt tot en met ${formatDateNL(params.expiresAt)}.`,
    "",
    "Dit is je code:",
    params.licenseCode,
    "",
    "Zo activeer je:",
    "1. Download via https://www.dicteren.ai/download.",
    "2. Open de app. Het activatiescherm verschijnt meteen.",
    "3. Plak je code. Klaar.",
    "",
    "Probeer Dicteren.ai de eerste dagen in verschillende programma's: Outlook, Word, je browser. Daar merk je het verschil het snelst.",
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
    "Een week onderweg",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je gebruikt Dicteren.ai nu een week. Nog <strong>${params.daysLeft} dagen</strong> in je proefperiode, tot ${formatDateNL(params.expiresAt)}.</p>
  <p style="margin:0 0 6px 0;">Bevalt het? Pak dan een licentie zodat je gewoon door kan typen met je stem.</p>
  ${cta(`${emailBase()}/prijzen?utm_source=trial_d7_email`, "Bekijk de prijzen")}
  <p style="margin:0 0 14px 0;">Vanaf <strong>€12 per maand</strong> of <strong>€96 per jaar</strong>. Maandelijks opzegbaar, geen kleine lettertjes.</p>
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Werkt iets niet zoals verwacht? Antwoord op deze mail.</p>`,
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
    `Je gebruikt Dicteren.ai nu een week. Nog ${params.daysLeft} dagen in je proefperiode, tot ${formatDateNL(params.expiresAt)}.`,
    "",
    "Bevalt het? Pak dan een licentie zodat je gewoon door kan typen met je stem.",
    "https://www.dicteren.ai/prijzen",
    "",
    "Vanaf €12 per maand. Maandelijks opzegbaar, geen kleine lettertjes.",
    "",
    "Werkt iets niet zoals verwacht? Antwoord op deze mail.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function trialReminderD13Html(params: {
  name?: string;
  expiresAt: Date;
}): string {
  return shellHtml(
    "Morgen loopt je trial af",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je proefperiode eindigt morgen, <strong>${formatDateNL(params.expiresAt)}</strong>.</p>
  <p style="margin:0 0 6px 0;">Kies een licentie en blijf gewoon doortypen met je stem. Geen onderbreking, geen nieuwe code.</p>
  ${cta(`${emailBase()}/prijzen?utm_source=trial_d13_email`, "Kies een licentie")}
  <ul style="margin:0 0 14px 20px;padding:0;">
    <li style="margin-bottom:6px;"><strong>€12 per maand</strong>, maandelijks opzegbaar.</li>
    <li style="margin-bottom:6px;"><strong>€30 per kwartaal</strong>, 17% korting.</li>
    <li><strong>€96 per jaar</strong>, 33% korting (= €8 per maand).</li>
  </ul>
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Vragen? Antwoord op deze mail. Je hoort dezelfde dag van ons.</p>`,
  );
}

function trialReminderD13Text(params: {
  name?: string;
  expiresAt: Date;
}): string {
  return [
    greet(params.name),
    "",
    `Je proefperiode eindigt morgen, ${formatDateNL(params.expiresAt)}.`,
    "",
    "Kies een licentie en blijf gewoon doortypen met je stem. Geen onderbreking, geen nieuwe code.",
    "https://www.dicteren.ai/prijzen",
    "",
    "Opties:",
    "- €12 per maand, maandelijks opzegbaar.",
    "- €30 per kwartaal, 17% korting.",
    "- €96 per jaar, 33% korting (= €8 per maand).",
    "",
    "Vragen? Antwoord op deze mail. Je hoort dezelfde dag van ons.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function trialExpiredHtml(params: { name?: string }): string {
  return shellHtml(
    "Je proefperiode is voorbij",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
  <p style="margin:0 0 14px 0;">Je 14 dagen zijn voorbij. De app vraagt nu om een licentie.</p>
  <p style="margin:0 0 14px 0;">Je instellingen en geschiedenis blijven gewoon staan. Kies een licentie, en je gaat verder waar je gebleven was.</p>
  ${cta(`${emailBase()}/prijzen?utm_source=trial_expired_email`, "Kies een licentie")}
  <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Feedback waarom je nog twijfelt? Antwoord op deze mail. We lezen elke reactie.</p>`,
  );
}

function trialExpiredText(params: { name?: string }): string {
  return [
    greet(params.name),
    "",
    "Je 14 dagen zijn voorbij. De app vraagt nu om een licentie.",
    "",
    "Je instellingen en geschiedenis blijven gewoon staan. Kies een licentie en je gaat verder waar je gebleven was.",
    "",
    "https://www.dicteren.ai/prijzen",
    "",
    "Feedback waarom je nog twijfelt? Antwoord op deze mail.",
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
    subject: "Nieuw wachtwoord instellen",
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
    subject: "Bevestig je e-mailadres",
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
  /** Voorgevulde licentiecode voor de seat die deze invite vertegenwoordigt.
   *  Komt uit licenses.invitationId = invitation.id mapping. */
  licenseCode?: string;
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
    <p style="margin:0 0 14px 0;">${
      params.inviterName ? `${params.inviterName} heeft je` : "Je bent"
    } toegevoegd aan het Dicteren.ai-team als <strong>${roleLabel}</strong>.</p>
    <p style="margin:0 0 6px 0;">Stel eerst je eigen wachtwoord in. De link werkt 24 uur.</p>
    ${cta(params.setPasswordUrl, "Stel je wachtwoord in")}
    <p style="margin:0 0 6px 0;font-size:14px;">Daarna log je in op het admin-dashboard:</p>
    <p style="margin:0 0 18px 0;font-size:15px;">${brandLink(params.adminUrl, params.adminUrl)}</p>
    ${
      params.hasLifetime
        ? `<p style="margin:0 0 14px 0;font-size:14px;color:${BRAND.textMuted};">Je hebt automatisch lifetime-toegang gekregen voor persoonlijk gebruik van de app.</p>`
        : ""
    }
    <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.textMuted};">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.setPasswordUrl}</p>
    <p style="margin:0;font-size:14px;color:${BRAND.textSoft};">Vragen? Mail info@dicteren.ai${params.inviterName ? ` of vraag ${params.inviterName}` : ""}.</p>`,
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
    "Nieuw wachtwoord instellen",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">Je vroeg een wachtwoord-herstel aan. Stel hieronder een nieuw wachtwoord in. De link werkt 1 uur.</p>
    ${cta(params.resetUrl, "Stel nieuw wachtwoord in")}
    <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.textMuted};">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.resetUrl}</p>
    <p style="margin:0;font-size:14px;color:${BRAND.textSoft};">Geen herstel aangevraagd? Negeer deze mail. Je wachtwoord blijft staan.</p>`,
  );
}

function passwordResetText(params: { name?: string; resetUrl: string }): string {
  return [
    greet(params.name),
    "",
    "Je vroeg een wachtwoord-herstel aan. Stel een nieuw wachtwoord in via onderstaande link. De link werkt 1 uur.",
    "",
    params.resetUrl,
    "",
    "Geen herstel aangevraagd? Negeer deze mail. Je wachtwoord blijft staan.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

function emailVerificationHtml(params: { name?: string; verifyUrl: string }): string {
  return shellHtml(
    "Bevestig je e-mailadres",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 6px 0;">Welkom bij Dicteren.ai. Bevestig je e-mailadres, dan kunnen we je je licentie, facturen en verlengingen sturen.</p>
    ${cta(params.verifyUrl, "Bevestig e-mailadres")}
    <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.textMuted};">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.verifyUrl}</p>
    <p style="margin:0;font-size:14px;color:${BRAND.textSoft};">Niet door jou aangevraagd? Negeer deze mail.</p>`,
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
  licenseCode?: string;
}): string {
  const codeSection = params.licenseCode
    ? `<p style="margin:0 0 6px 0;">Je persoonlijke teamlicentie:</p>${codeBlock(params.licenseCode)}<p style="margin:0 0 14px 0;">Werkt op maximaal 2 apparaten. Activeer 'm in de app na het accepteren.</p>`
    : `<p style="margin:0 0 6px 0;">Met dit team gebruik je een eigen teamlicentie. Praat. En het staat er, in elke app.</p>`;
  return shellHtml(
    `Uitnodiging voor ${params.organizationName}`,
    `<p style="margin:0 0 14px 0;">Hallo,</p>
    <p style="margin:0 0 14px 0;"><strong>${params.inviterName}</strong> nodigt je uit voor <strong>${params.organizationName}</strong> op Dicteren.ai.</p>
    ${codeSection}
    ${cta(params.inviteUrl, "Uitnodiging accepteren")}
    <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.textMuted};">Werkt de knop niet? Plak deze link in je browser:</p>
    <p style="margin:0 0 18px 0;font-size:13px;word-break:break-all;color:${BRAND.textMuted};">${params.inviteUrl}</p>`,
  );
}

function organizationInviteText(params: {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
  licenseCode?: string;
}): string {
  const lines = [
    "Hoi,",
    "",
    `${params.inviterName} heeft je uitgenodigd voor ${params.organizationName} op Dicteren.ai.`,
    "",
  ];
  if (params.licenseCode) {
    lines.push("Je persoonlijke teamlicentie:");
    lines.push(params.licenseCode);
    lines.push("");
    lines.push("Werkt op maximaal 2 apparaten.");
    lines.push("");
  }
  lines.push("Accepteer hier:");
  lines.push(params.inviteUrl);
  lines.push("");
  lines.push("Dicteren.ai");
  return lines.join("\n");
}

// ── Reseller-funnel: AM-signature voor de funnel-mails ──
// De Gmail-signature komt niet mee via Resend, dus we bouwen 'm in de template na
// (naam + functie + telefoon-indien-bekend + logo). Telefoon uit amSignature.ts.
function amSignatureHtml(name: string, phone?: string | null): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
    <tr><td style="font-size:14px;line-height:1.5;color:${BRAND.text};">
      <strong style="color:${BRAND.navy};">${name}</strong><br>Accountmanager${phone ? `<br>${phone}` : ""}
    </td></tr>
    <tr><td style="padding-top:12px;">
      <img src="${logoUrl()}" alt="Dicteren.ai" width="150" style="display:block;height:auto;border:0;">
    </td></tr>
  </table>`;
}

function funnelMailShell(title: string, body: string, footer: string): string {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${EMAIL_FONT};color:${BRAND.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr><td align="center" style="padding:40px 16px 24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.white};border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(4,38,96,0.07);">
        <tr><td style="background:${BRAND.aquaWash};padding:32px 40px 24px 40px;text-align:center;">
          <img src="${logoUrl()}" alt="Dicteren.ai" width="170" style="display:block;height:auto;margin:0 auto;border:0;">
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:16px;line-height:1.65;color:${BRAND.text};">${body}</td></tr>
        <tr><td style="padding:20px 40px 28px 40px;border-top:1px solid ${BRAND.borderSoft};">
          <p style="margin:0;font-size:12px;color:${BRAND.textSoft};">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Reseller-funnel: partnerdeck-mail (vanuit het AM-adres) ──
// CONCEPT-copy, akkoord Christian 2026-06-17. B1, TOV-conform, geen cijfer-claims,
// geen founder-stem. Cold-context (geen account-footer). De finale wervingstekst
// staat op de deck-pagina en gaat via de copy-gate. From = AM-adres.
function partnerDeckHtml(params: {
  contactName?: string | null;
  amName: string;
  amPhone?: string | null;
  deckUrl: string;
}): string {
  const hi = params.contactName ? `Hoi ${params.contactName},` : "Hoi,";
  const body = `
    <p style="margin:0 0 16px 0;">${hi}</p>
    <p style="margin:0 0 16px 0;">Ik denk dat Dicteren.ai interessant is om aan je klanten aan te bieden. Nederlandse spraak naar tekst, lokaal op het apparaat.</p>
    <p style="margin:0 0 8px 0;">Ik zette een korte pagina voor je klaar met het hele verhaal en het partnerprogramma.</p>
    ${cta(params.deckUrl, "Bekijk het partnerdeck")}
    <p style="margin:16px 0 0 0;">Vragen? Antwoord gewoon op deze mail.</p>
    ${amSignatureHtml(params.amName, params.amPhone)}`;
  return funnelMailShell(
    "Dicteren.ai partnerprogramma",
    body,
    "Geen interesse? Eén antwoord en je hoort niks meer van ons. Dicteren.ai, Nijmegen.",
  );
}

export async function sendPartnerDeckEmail(params: {
  to: string;
  contactName?: string | null;
  amName: string;
  amEmail: string;
  deckUrl: string;
  contactId?: string;
}): Promise<ServiceResult<SendResult>> {
  const phone = amPhone(params.amEmail);
  const hi = params.contactName ? `Hoi ${params.contactName},` : "Hoi,";
  const sig = `${params.amName}\nAccountmanager${phone ? `\n${phone}` : ""}\nDicteren.ai`;
  const text = `${hi}\n\nIk denk dat Dicteren.ai interessant is om aan je klanten aan te bieden. Nederlandse spraak naar tekst, lokaal op het apparaat.\n\nBekijk het partnerdeck:\n${params.deckUrl}\n\nVragen? Antwoord op deze mail.\n\n${sig}`;
  return sendEmail({
    to: params.to,
    subject: "Word reseller van Dicteren.ai",
    html: partnerDeckHtml({ ...params, amPhone: phone }),
    text,
    from: `${params.amName} (Dicteren.ai) <${params.amEmail}>`,
    replyTo: params.amEmail,
    tags: [{ name: "category", value: "partner_deck" }],
    idempotencyKey: params.contactId
      ? `partner-deck/${params.contactId}`
      : undefined,
    log: { category: "partner_deck" },
  });
}

// ── Reseller-funnel: welkomstmail naar de nieuwe reseller (bij promote) ──
// CONCEPT-copy, akkoord Christian 2026-06-17. Vanuit het AM-adres.
function partnerWelcomeHtml(params: {
  contactName?: string | null;
  amName: string;
  amPhone?: string | null;
  landingUrl?: string | null;
  discountCode?: string | null;
  portalUrl?: string | null;
  loginUrl?: string | null;
}): string {
  const hi = params.contactName ? `Hoi ${params.contactName},` : "Hoi,";

  // Gecentreerd blok met de spullen van de partner: landingspagina, eigen
  // kortingscode en het portaal. Alleen tonen wat we hebben.
  const rows: string[] = [];
  if (params.landingUrl) {
    rows.push(
      `<p style="margin:0 0 14px 0;"><span style="color:#4a6080;font-size:13px;">Je landingspagina</span><br><a href="${params.landingUrl}" style="color:#042660;font-weight:600;text-decoration:none;">${params.landingUrl}</a></p>`,
    );
  }
  if (params.discountCode) {
    rows.push(
      `<p style="margin:0 0 14px 0;"><span style="color:#4a6080;font-size:13px;">Je eigen kortingscode (15% op je zakelijke licenties)</span><br><strong style="color:#042660;font-size:18px;letter-spacing:0.5px;">${params.discountCode}</strong></p>`,
    );
  }
  if (params.portalUrl) {
    rows.push(
      `<p style="margin:0;"><span style="color:#4a6080;font-size:13px;">Je partnerportaal</span><br><a href="${params.portalUrl}" style="color:#042660;font-weight:600;text-decoration:none;">${params.portalUrl}</a></p>`,
    );
  }
  const bullets = rows.length
    ? `<div style="margin:0 0 20px 0;padding:20px 24px;background:#f4f8fd;border-radius:12px;text-align:center;">${rows.join("")}</div>`
    : "";

  const loginBtn = params.loginUrl
    ? `<p style="text-align:center;margin:0 0 20px 0;"><a href="${params.loginUrl}" style="display:inline-block;background:#FF8441;color:#ffffff;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">Log direct in op je portaal</a></p>`
    : "";

  const body = `
    <p style="margin:0 0 16px 0;">${hi}</p>
    <p style="margin:0 0 16px 0;">Top dat je meedoet. Je bent nu partner van Dicteren.ai. Hierbij alvast je spullen:</p>
    ${bullets}
    ${loginBtn}
    <p style="margin:0 0 16px 0;">Ik bel je deze week om je commissie en je eigen pagina af te ronden. Heb je voor die tijd een vraag? Antwoord gewoon op deze mail.</p>
    ${amSignatureHtml(params.amName, params.amPhone)}`;
  return funnelMailShell(
    "Welkom als partner van Dicteren.ai",
    body,
    "Dicteren.ai, Nijmegen.",
  );
}

export async function sendPartnerWelcomeEmail(params: {
  to: string;
  contactName?: string | null;
  amName: string;
  amEmail: string;
  contactId?: string;
  landingUrl?: string | null;
  discountCode?: string | null;
  portalUrl?: string | null;
  loginUrl?: string | null;
}): Promise<ServiceResult<SendResult>> {
  const phone = amPhone(params.amEmail);
  const hi = params.contactName ? `Hoi ${params.contactName},` : "Hoi,";
  const sig = `${params.amName}\nAccountmanager${phone ? `\n${phone}` : ""}\nDicteren.ai`;
  const lines: string[] = [];
  if (params.landingUrl) lines.push(`Je landingspagina: ${params.landingUrl}`);
  if (params.discountCode)
    lines.push(
      `Je eigen kortingscode (15% op je zakelijke licenties): ${params.discountCode}`,
    );
  if (params.portalUrl) lines.push(`Je partnerportaal: ${params.portalUrl}`);
  const spullen = lines.length ? `\n\n${lines.join("\n")}` : "";
  const login = params.loginUrl
    ? `\n\nLog direct in op je portaal: ${params.loginUrl}`
    : "";
  const text = `${hi}\n\nTop dat je meedoet. Je bent nu partner van Dicteren.ai. Hierbij alvast je spullen:${spullen}${login}\n\nIk bel je deze week om je commissie en je eigen pagina af te ronden. Heb je voor die tijd een vraag? Antwoord gewoon op deze mail.\n\n${sig}`;
  return sendEmail({
    to: params.to,
    subject: "Welkom als partner van Dicteren.ai",
    html: partnerWelcomeHtml({ ...params, amPhone: phone }),
    text,
    from: `${params.amName} (Dicteren.ai) <${params.amEmail}>`,
    replyTo: params.amEmail,
    tags: [{ name: "category", value: "other" }],
    idempotencyKey: params.contactId
      ? `partner-welcome/${params.contactId}`
      : undefined,
    log: { category: "other" },
  });
}
