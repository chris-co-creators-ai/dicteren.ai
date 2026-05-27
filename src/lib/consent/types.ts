// Dicteren.ai — Cookie-consent types
//
// Vier categorieën conform EDPB-richtlijn + Google Consent Mode v2.
//
// Niet-aanpasbaar:
//   - "necessary"  → strictly-necessary, altijd granted (session, CSRF, consent zelf)
//
// Aanpasbaar door gebruiker:
//   - "functional"   → taalvoorkeur, theme, UI-state
//   - "analytics"    → GA4 measurement, Vercel Analytics
//   - "marketing"    → Google Ads, remarketing, social pixels

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = `dicteren_cookie_consent_v${CONSENT_VERSION}`;

export type CookieCategory =
  | "necessary"
  | "functional"
  | "analytics"
  | "marketing";

export type ConsentState = {
  necessary: true; // altijd true, can't toggle
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentRecord = {
  state: ConsentState;
  /** Wanneer de gebruiker zijn keuze maakte (ISO timestamp). */
  decidedAt: string;
  /** Schema-versie van consent. Bij bump → ongeldig, banner toont opnieuw. */
  version: number;
};

export const DEFAULT_DENIED: ConsentState = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const ALL_GRANTED: ConsentState = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};
