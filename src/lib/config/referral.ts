// PRD self-serve-referral, Fase 1 — de vaste commissie-preset voor self-serve affiliates.
// Beslist door Christian 2026-06-23: 15% recurring, 12 maanden cap, consumer + business.
// Eén bron: de self-serve-creatie (createSelfServeAffiliate) én de admin-preset-config
// lezen hier. Wijzigt de preset → alleen hier aanpassen.
//
// Mapt 1-op-1 op de v2-commissievelden van `affiliates` (consumer*/business*).

export const SELF_SERVE_REFERRAL_PRESET = {
  consumer: {
    commissionType: "percentage" as const,
    commissionPct: 15,
    commissionFixedCents: 0,
    durationMonths: 12,
    recurringCommissionPct: 15,
    recurringCommissionFixedCents: 0,
  },
  business: {
    commissionType: "percentage" as const,
    commissionPct: 15,
    commissionFixedCents: 0,
    durationMonths: 12,
    recurringCommissionPct: 15,
    recurringCommissionFixedCents: 0,
  },
} as const;

export type ReferralPreset = typeof SELF_SERVE_REFERRAL_PRESET;
