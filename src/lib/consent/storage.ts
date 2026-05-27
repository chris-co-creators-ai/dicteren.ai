// Dicteren.ai — Cookie-consent storage (localStorage)
//
// Server-side rendering safe: alle calls zijn no-op buiten browser.
//
// Schema-bump (CONSENT_VERSION up) → oude record wordt niet meer gelezen,
// banner verschijnt opnieuw. Bewust gekozen zodat we bij nieuwe cookie-
// categorieën opnieuw toestemming kunnen vragen.

import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  type ConsentRecord,
  type ConsentState,
} from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readConsent(): ConsentRecord | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (!parsed.state || parsed.state.necessary !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(state: ConsentState): ConsentRecord {
  const record: ConsentRecord = {
    state,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  if (isBrowser()) {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // localStorage full of privacy-mode error — geen fatal
    }
  }
  return record;
}

export function clearConsent(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // negeer
  }
}
