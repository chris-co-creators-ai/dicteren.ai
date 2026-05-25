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
  createMollieCustomer,
  getMollieSubscription,
  type MollieMetadataRecord,
} from "./mollie";

export {
  buildMollieMetadata,
  segmentForLicenseType,
  startDateForFreeMonths,
  type CustomerSegment,
  type LicenseSource,
  type DiscountSnapshot,
  type MollieMetadataInput,
} from "./mollie-metadata";

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
  getUserSubscriptionView,
  type UserTrial,
  type UserLicense,
  type UserSubscription,
  type SubscriptionView,
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

export {
  getOrganization,
  getOrganizationBilling,
  getMembership,
  listUserOrganizations,
  listOrganizationMembers,
  deriveOrganizationSlug,
  upsertOrganizationBilling,
  type OrganizationBillingInput,
} from "./organization";

export {
  generateAffiliateCode,
  getAffiliateByCode,
  getAffiliateById,
  getAffiliateByUserId,
  getReferralForUser,
  attributeUserToAffiliate,
  markReferralConverted,
  calculateCommissionCents,
  recordCommission,
  createAffiliate,
  updateAffiliate,
  listAffiliates,
  getAffiliateStats,
  updateCommissionStatus,
  listAffiliateReferrals,
  listAffiliateCommissions,
  type CommissionType,
  type AffiliateStatusValue,
} from "./affiliate";
