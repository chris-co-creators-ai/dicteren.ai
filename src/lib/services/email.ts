// Dicteren.ai — Email Service (Resend)
// Shared mechanics: send transactional emails via Resend SDK.
// Domain logic (when/why to send) stays in actions.
// Source-of-truth: .claude/skills/resend-integration.md

import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";
import type { ServiceResult } from "@/lib/types";

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

// ───── Templates ───────────────────────────────────────────────────

function shellHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h1 style="font-size: 24px; margin: 0 0 16px;">${title}</h1>
  ${body}
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;">
  <p style="color: #999; font-size: 12px;">Dicteren.ai · Nederlandse dicteer-app voor lokaal gebruik</p>
</body>
</html>`;
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
    : "Geen vervaldatum.";
  return shellHtml(
    "Je licentie staat klaar",
    `<p>${greet(params.name)}</p>
  <p>Bedankt voor je aankoop. Hier is je licentiecode:</p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
    <code style="font-size: 20px; font-family: 'SF Mono', Menlo, monospace; letter-spacing: 0.5px; color: #1a1a1a;">${params.licenseCode}</code>
  </div>
  <p style="color: #666; font-size: 14px;">${expiry}</p>
  <p>Stappen om te starten:</p>
  <ol>
    <li>Download Dicteren.ai op <a href="https://dicteren.ai/download" style="color: #0066ff;">dicteren.ai/download</a></li>
    <li>Open de app — je krijgt direct het activatiescherm</li>
    <li>Plak je licentiecode hierboven</li>
  </ol>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Vragen? Mail <a href="mailto:info@dicteren.ai" style="color: #0066ff;">info@dicteren.ai</a> of antwoord op deze mail.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>Bedankt voor je registratie. Bekijk de prijzen op <a href="https://dicteren.ai/prijzen" style="color: #0066ff;">dicteren.ai/prijzen</a> om aan de slag te gaan.</p>
  <p>Vragen? Mail <a href="mailto:info@dicteren.ai" style="color: #0066ff;">info@dicteren.ai</a>.</p>`,
  );
}

function pastDueEmailHtml(params: { name?: string; graceUntil: Date }): string {
  return shellHtml(
    "Je laatste betaling is mislukt",
    `<p>${greet(params.name)}</p>
  <p>De automatische afschrijving voor je Dicteren.ai-abonnement is mislukt. Mollie probeert het automatisch opnieuw in de komende dagen.</p>
  <p><strong>Wat dit voor jou betekent:</strong></p>
  <ul>
    <li>Je app blijft werken tot <strong>${formatDateNL(params.graceUntil)}</strong>.</li>
    <li>Daarna wordt Dicteren.ai gelocked tot je je betaalgegevens hebt bijgewerkt.</li>
  </ul>
  <p><a href="https://dicteren.ai/account/billing" style="color: #ffffff; background: #FF8F43; display: inline-block; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Werk je betaalgegevens bij</a></p>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Heb je dit al opgelost? Dan kun je deze mail negeren.</p>
  <p style="color: #666; font-size: 14px;">Vragen? Mail <a href="mailto:info@dicteren.ai" style="color: #0066ff;">info@dicteren.ai</a>.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>We hebben je opzegging ontvangen. ${tail}</p>
  <p>Je instellingen en geschiedenis blijven bewaard — je kunt op elk moment terugkeren.</p>
  <p><a href="https://dicteren.ai/prijzen" style="color: #0066ff;">Bekijk de prijzen</a> als je later opnieuw wilt abonneren.</p>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Verkeerd opgezegd? Mail <a href="mailto:info@dicteren.ai" style="color: #0066ff;">info@dicteren.ai</a> — we helpen je verder.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>We hebben een terugbetaling van <strong>${formatAmount(params.amountCents, params.currency)}</strong> in gang gezet voor order <code>${params.orderId.slice(0, 8)}…</code>.</p>
  <p>Het geld staat binnen 1-5 werkdagen terug op de rekening waarmee je hebt betaald.</p>
  <p>Je Dicteren.ai-licentie is meteen ingetrokken — de app vraagt bij de volgende start om een nieuwe code.</p>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Vragen of klopt iets niet? Mail <a href="mailto:info@dicteren.ai" style="color: #0066ff;">info@dicteren.ai</a>.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>We hebben <strong>${formatAmount(params.amountCents, params.currency)}</strong> afgeschreven voor de verlenging van je Dicteren.ai-abonnement.</p>
  <p>Je toegang loopt nu door tot <strong>${formatDateNL(params.newExpiresAt)}</strong>.</p>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Wil je opzeggen of de afschrijving stoppen? <a href="https://dicteren.ai/account/billing" style="color: #0066ff;">Beheer je abonnement</a>.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>Je proefperiode is geactiveerd tot en met <strong>${formatDateNL(params.expiresAt)}</strong>.</p>
  <p>Hier is je code voor de desktop-app:</p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
    <code style="font-size: 20px; font-family: 'SF Mono', Menlo, monospace; letter-spacing: 0.5px; color: #1a1a1a;">${params.licenseCode}</code>
  </div>
  <p>Stappen om te starten:</p>
  <ol>
    <li>Download Dicteren.ai op <a href="https://dicteren.ai/download?utm_source=trial_start_email" style="color: #0066ff;">dicteren.ai/download</a></li>
    <li>Open de app — je krijgt direct het activatiescherm</li>
    <li>Plak je code hierboven</li>
  </ol>
  <p>Onze tip: probeer de eerste dagen verschillende programma's — Outlook, Word, Notion, browser. Zo merk je waar Dicteren.ai het verschil maakt.</p>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Vragen? Mail <a href="mailto:info@dicteren.ai" style="color: #0066ff;">info@dicteren.ai</a> of antwoord op deze mail.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>Je gebruikt Dicteren.ai nu een week. Nog <strong>${params.daysLeft} dagen</strong> in je proefperiode (tot ${formatDateNL(params.expiresAt)}).</p>
  <p>Werkt het zoals je hoopte? We zien het graag — neem dan een licentie en blijf doorgaan:</p>
  <p style="margin: 24px 0;">
    <a href="https://dicteren.ai/prijzen?utm_source=trial_d7_email" style="color: #ffffff; background: #FF8F43; display: inline-block; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Bekijk de prijzen</a>
  </p>
  <p>Vanaf €12 per maand of €96 per jaar. Geen verborgen kosten, opzeggen wanneer je wilt.</p>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Werkt iets niet goed? Stuur een mail terug — we lossen het op.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>Je proefperiode van Dicteren.ai loopt af op <strong>${formatDateNL(params.expiresAt)}</strong>. Dat is morgen.</p>
  <p>Koop nu een licentie zodat je app gewoon door kan blijven werken — geen onderbreking, geen nieuwe code, geen gedoe.</p>
  <p style="margin: 24px 0;">
    <a href="https://dicteren.ai/prijzen?utm_source=trial_d13_email" style="color: #ffffff; background: #FF8F43; display: inline-block; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Kies een licentie</a>
  </p>
  <ul>
    <li><strong>€12/maand</strong> — flexibel, opzeggen wanneer je wilt</li>
    <li><strong>€30/kwartaal</strong> — 17% korting</li>
    <li><strong>€96/jaar</strong> — 33% korting, twee maanden gratis</li>
  </ul>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Vragen? Mail <a href="mailto:info@dicteren.ai" style="color: #0066ff;">info@dicteren.ai</a> — we beantwoorden dezelfde dag.</p>`,
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
    `<p>${greet(params.name)}</p>
  <p>Je 14-dagen proefperiode van Dicteren.ai is afgelopen. De app vraagt nu om een licentie voor je verder kunt.</p>
  <p>Je instellingen en geschiedenis blijven gewoon bewaard — koop een licentie en je gaat verder waar je gebleven was.</p>
  <p style="margin: 24px 0;">
    <a href="https://dicteren.ai/prijzen?utm_source=trial_expired_email" style="color: #ffffff; background: #FF8F43; display: inline-block; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Kies een licentie</a>
  </p>
  <p style="margin-top: 32px; color: #666; font-size: 14px;">Hulp nodig of feedback waarom je nog niet kiest? Antwoord gerust op deze mail. We lezen elke reactie.</p>`,
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
