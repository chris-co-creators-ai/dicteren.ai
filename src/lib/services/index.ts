// Dicteren.ai — Service Layer
// Services own reusable operational mechanics (the "how")
// Actions (API routes, admin pages) own domain rules (the "why/when")

export {
  generateLicenseCode,
  generateLicenseCodes,
  hashLicenseCode,
  normalizeLicenseCode,
  validateLicenseCodeFormat,
  calculateBetaExpiry,
  isExpired,
} from "./license";

export { signLicenseToken, verifyLicenseToken } from "./token";

export { logEvent, trackEvent } from "./audit";

export {
  createPayment,
  verifyWebhookPayment,
  formatMollieAmount,
  mapMollieStatus,
} from "./mollie";

export {
  sendEmail,
  sendLicenseEmail,
  sendWelcomeEmail,
  sendPastDueEmail,
  sendCancelEmail,
  sendRefundEmail,
  sendRenewalEmail,
} from "./email";
