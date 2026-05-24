// Dicteren.ai — Plan configuration
// Pricing is draft pending Christian's approval

import type { Plan } from "@/lib/types";

export const PLANS: Plan[] = [
  // Consumer plans
  {
    id: "consumer_monthly",
    name: "Privé Maandelijks",
    slug: "prive-maandelijks",
    type: "consumer",
    period: "monthly",
    priceEur: 12,
    maxActivations: 2,
    maxUsers: 1,
    isActive: true,
  },
  {
    id: "consumer_quarterly",
    name: "Privé Kwartaal",
    slug: "prive-kwartaal",
    type: "consumer",
    period: "quarterly",
    priceEur: 30,
    maxActivations: 2,
    maxUsers: 1,
    isActive: true,
  },
  {
    id: "consumer_yearly",
    name: "Privé Jaarlijks",
    slug: "prive-jaarlijks",
    type: "consumer",
    period: "yearly",
    priceEur: 96,
    maxActivations: 2,
    maxUsers: 1,
    isActive: true,
  },
  // Organization plans
  {
    id: "organization_seat_yearly",
    name: "Zakelijk Per Gebruiker",
    slug: "zakelijk-per-gebruiker",
    type: "organization",
    period: "yearly",
    priceEur: 84,
    maxActivations: 2,
    maxUsers: 1,
    isActive: true,
  },
];

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
