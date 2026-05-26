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

export {
  logEvent,
  trackEvent,
  getEventsByActor,
  getOrgAuditFeed,
  type AuditAction,
  type TrackEventName,
} from "./audit";

export {
  createPayment,
  verifyWebhookPayment,
  formatMollieAmount,
  mapMollieStatus,
  createMollieCustomer,
  getMollieSubscription,
  createMollieRefund,
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
  sendOrganizationInviteEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
} from "./email";

export {
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
} from "./orgEmail";

export {
  claimTrialForUser,
  claimAndNotifyTrial,
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
  listUserSubscriptionsForBilling,
  type UserTrial,
  type UserLicense,
  type UserSubscription,
  type SubscriptionView,
  type UserSubscriptionForBilling,
} from "./account";

export {
  listPartnerOrgs,
  getPartnerOrg,
  updatePartnerOrg,
  createPartnerOrg,
  bulkCreatePartnerOrgs,
  archivePartnerOrg,
  issuePartnerCode,
  partnerOrgsKpis,
  getPartnerActivationStats,
  type PartnerOrgListItem,
  type PartnerOrgPatch,
  type CreatePartnerOrgArgs,
  type PartnerActivationStats,
} from "./partner";

export {
  getOrganization,
  getOrganizationBilling,
  getMembership,
  listUserOrganizations,
  listManageableOrganizations,
  listOrganizationMembers,
  listOrganizationInvitations,
  listOrganizationLicenses,
  deriveOrganizationSlug,
  upsertOrganizationBilling,
  type OrganizationBillingInput,
} from "./organization";

export {
  listLeadLists,
  createLeadList,
  updateLeadList,
  deleteLeadList,
  getLeadList,
  addMembersToList,
  removeMembersFromList,
  membershipsByUser,
  userIdsInList,
  listAdminUsers,
  type LeadListWithCount,
  type ListColorValue,
} from "./leadList";

export {
  setCustomerAttributes,
  bulkSetCustomerAttributes,
  attributesByUser,
  defaultStageFor,
  defaultTemperatureFor,
  type CustomerStageValue,
  type CustomerTemperatureValue,
  type CustomerAttrPatch,
} from "./customerCrm";

export {
  getColumnPrefs,
  setColumnPrefs,
  DEFAULT_VISIBLE_COLUMNS,
  COLUMN_LABELS,
  type ColumnKey,
  type ColumnPrefs,
} from "./columnPrefs";

export {
  listCustomColumns,
  createCustomColumn,
  updateCustomColumn,
  deleteCustomColumn,
  type CustomColumnDef,
  type CustomColumnType,
} from "./customColumns";

export {
  addProspect,
  bulkImportProspects,
  type ProspectInput,
  type ProspectImportResult,
} from "./prospect";

export {
  hashIp,
  getClientIp,
  checkRateLimit,
  enforceRateLimit,
  pruneRateLimitEvents,
  RATE_LIMITS,
  type RateLimitResult,
  type RateLimitBucket,
} from "./rateLimit";

export {
  createContactMessage,
  listContactMessages,
  getContactMessage,
  updateContactMessage,
  contactMessageKpis,
  type ContactMessageKind,
  type ContactMessageStatus,
} from "./contactMessage";

export {
  validateDiscountCode,
  incrementDiscountRedemption,
  createDiscountCodeForAffiliate,
  listDiscountCodesForAffiliate,
  setDiscountCodeActive,
  discountCodesForUsers,
  type DiscountValidation,
  type DiscountValidationOk,
  type DiscountValidationFail,
} from "./discount";

export {
  listCustomers,
  listOrganizations,
  identityKpis,
  listCustomerFunnel,
  classifyStage,
  funnelStageCounts,
  getContactByLicenseId,
  getContactByMolliePaymentId,
  getUserIdByMollieCustomerId,
  type CustomerRow,
  type OrganizationRow,
  type CustomerFunnelRow,
  type FunnelStage,
  type BillingContactByLicense,
  type BillingContactByPayment,
} from "./identity";

export {
  SEAT_BASE_PRICE_CENTS,
  CUSTOM_QUOTE_FROM,
  SEAT_TIERS,
  CUSTOM_TIER,
  getTierForSeats,
  nextTier,
  calculateTotalCents,
  calculateProrationCents,
  tierLabel,
  type SeatTier,
  type SeatTierId,
} from "./pricingTiers";

export {
  getOrgSeatSnapshot,
  getOrgSeatSnapshotBulk,
  listOrgSeats,
  listOrgDevices,
  findUnassignedSeat,
  assignSeatToMember,
  reserveSeatForInvitation,
  releaseSeatReservation,
  revokeSeat,
  reassignSeat,
  revokeActivation,
  revokeAllActivationsForMember,
  createUnassignedSeats,
  getOrgOwner,
  getOrgInfo,
  tierIdString,
  type OrgSeatSnapshot,
  type SeatRow,
  type SeatDeviceRow,
} from "./orgSeats";

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
