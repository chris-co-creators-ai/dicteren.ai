// Dicteren.ai — Email Service
// Shared mechanics: send transactional emails
// Domain logic (when to send, what template) stays in actions
// TODO: Connect email provider when Christian approves

import type { ServiceResult } from "@/lib/types";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a transactional email
 * TODO: Implement when email provider is connected
 */
export async function sendEmail(params: SendEmailParams): Promise<ServiceResult<void>> {
  // TODO: Connect email provider
  if (process.env.NODE_ENV === "development") {
    console.log("[email]", params.to, params.subject);
  }
  return { success: true, data: undefined };
}

/**
 * Send license activation email with the license code
 */
export async function sendLicenseEmail(params: {
  to: string;
  name?: string;
  licenseCode: string;
  expiresAt: Date | null;
}): Promise<ServiceResult<void>> {
  const expiryText = params.expiresAt
    ? `Geldig tot: ${params.expiresAt.toLocaleDateString("nl-NL")}`
    : "Geen vervaldatum";

  return sendEmail({
    to: params.to,
    subject: "Je Dicteren.ai licentie",
    html: `
      <h1>Welkom bij Dicteren.ai${params.name ? `, ${params.name}` : ""}!</h1>
      <p>Je licentiecode:</p>
      <p style="font-size: 24px; font-family: monospace; background: #f0f0f0; padding: 16px; border-radius: 8px;">
        <strong>${params.licenseCode}</strong>
      </p>
      <p>${expiryText}</p>
      <p>Open Dicteren.ai en voer deze code in om je licentie te activeren.</p>
      <p>Vragen? Mail ons op support@dicteren.ai</p>
    `,
  });
}

/**
 * Send welcome email after payment
 */
export async function sendWelcomeEmail(params: {
  to: string;
  name?: string;
}): Promise<ServiceResult<void>> {
  return sendEmail({
    to: params.to,
    subject: "Welkom bij Dicteren.ai!",
    html: `
      <h1>Welkom${params.name ? `, ${params.name}` : ""}!</h1>
      <p>Bedankt voor je aankoop van Dicteren.ai.</p>
      <p>Je ontvangt zo je licentiecode per e-mail.</p>
      <p>Heb je vragen? Mail ons op support@dicteren.ai</p>
    `,
  });
}
