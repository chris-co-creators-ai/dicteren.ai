// Dicteren.ai — Google Consent Mode v2 helpers
//
// Vanaf maart 2024 verplicht voor GA4 / Google Ads in EU. We zetten
// 7 consent-states: 4 unique (analytics/ad_storage/ad_user_data/
// ad_personalization) + functionality_storage + personalization_storage
// + security_storage (altijd granted).

import type { ConsentState } from "./types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type GtagConsentArgs = {
  ad_storage: "granted" | "denied";
  analytics_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  functionality_storage: "granted" | "denied";
  personalization_storage: "granted" | "denied";
  security_storage: "granted";
};

export function buildGtagConsent(state: ConsentState): GtagConsentArgs {
  return {
    // analytics
    analytics_storage: state.analytics ? "granted" : "denied",
    // marketing
    ad_storage: state.marketing ? "granted" : "denied",
    ad_user_data: state.marketing ? "granted" : "denied",
    ad_personalization: state.marketing ? "granted" : "denied",
    // functional
    functionality_storage: state.functional ? "granted" : "denied",
    personalization_storage: state.functional ? "granted" : "denied",
    // altijd granted
    security_storage: "granted",
  };
}

/** Roep dit aan wanneer consent verandert. Veilig in SSR (no-op). */
export function pushConsentUpdate(state: ConsentState): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", buildGtagConsent(state));
}
