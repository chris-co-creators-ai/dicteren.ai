// Dicteren.ai — Plan configuration
// Defaults voor beta + trial codes. De echte plan-rows leven in de
// `plans` Drizzle-tabel; lookups via `getPlanBySlug` in services/order.ts.

export const BETA_DEFAULTS = {
  validityDays: 90,
  maxActivations: 2,
  maxUsers: 1,
  paymentRequired: false,
} as const;

/** Anonymous self-service trial — 1× per device-fingerprint, permanent. */
export const TRIAL_DEFAULTS = {
  validityDays: 14,
  maxActivations: 1,
  maxUsers: 1,
  paymentRequired: false,
} as const;

export const LICENSE_CODE_PREFIXES = {
  beta: "DIC-BETA",
  trial: "DIC-TRIAL",
  consumer: "DIC-PRO",
  team: "DIC-TEAM",
  partner: "DIC-NPO",
} as const;
