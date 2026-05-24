// Dicteren.ai — Service Layer
// Services own reusable operational mechanics (the "how")
// Actions (API routes, admin pages) own domain rules (the "why/when")

export {
  generateLicenseCode,
  generateLicenseCodes,
  generateTrialCode,
  hashLicenseCode,
  normalizeLicenseCode,
  validateLicenseCodeFormat,
  calculateBetaExpiry,
  calculateTrialExpiry,
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
  sendTrialStartedEmail,
  sendTrialReminderD7Email,
  sendTrialReminderD13Email,
  sendTrialExpiredEmail,
} from "./email";

export {
  claimTrialForUser,
  trialAlreadyUsedOnDevice,
  type ClaimTrialResult,
  type TrialErrorCode,
} from "./trial";

export {
  getCustomerSummary,
  getCustomerTimeline,
  type CustomerSummary,
  type TimelineEntry,
  type TimelineKind,
} from "./customer-timeline";

export {
  getUserTrial,
  listUserLicenses,
  listUserPaidLicenses,
  getUserActiveSubscription,
  type UserTrial,
  type UserLicense,
  type UserSubscription,
} from "./account";

export {
  listPartnerOrgs,
  getPartnerOrg,
  updatePartnerOrg,
  issuePartnerCode,
  partnerOrgsKpis,
  getPartnerActivationStats,
  type PartnerOrgListItem,
  type PartnerOrgPatch,
  type PartnerActivationStats,
} from "./partner";
