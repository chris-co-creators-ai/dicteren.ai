// Dicteren.ai — Google Ads conversie-helpers (client).
//
// Vuurt conversies via de gtag-stub die ConsentModeBootstrap site-breed in
// <head> zet; Google Consent Mode v2 handhaaft de consent-state (default
// denied), dus vuren is altijd veilig. Zonder env-vars is alles een no-op —
// de tag gaat pas leven als de ID's in Vercel staan.
//
// Env (Vercel + .env.local):
//   NEXT_PUBLIC_GOOGLE_ADS_ID       — "AW-XXXXXXXXXX" (Google-tag-id van account 7132988127)
//   NEXT_PUBLIC_GADS_LABEL_TRIAL    — conversie-label "Trial gestart"
//   NEXT_PUBLIC_GADS_LABEL_PURCHASE — conversie-label "Abonnement gekocht"

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const LABEL_TRIAL = process.env.NEXT_PUBLIC_GADS_LABEL_TRIAL;
const LABEL_PURCHASE = process.env.NEXT_PUBLIC_GADS_LABEL_PURCHASE;

type ConversionParams = {
  send_to: string;
  transaction_id: string;
  value?: number;
  currency?: string;
};

function fireConversion(label: string | undefined, params: Omit<ConversionParams, "send_to">): void {
  if (typeof window === "undefined") return;
  if (!GOOGLE_ADS_ID || !label) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    ...params,
  } satisfies ConversionParams);
}

/** "Trial gestart" — transactionId (licentie-code) dedupliceert refresh/herbezoek. */
export function trackTrialConversion(transactionId: string): void {
  fireConversion(LABEL_TRIAL, { transaction_id: transactionId });
}

/** "Abonnement gekocht" — met orderwaarde; transactionId = order-id (dedup). */
export function trackPurchaseConversion(opts: {
  valueEur: number;
  currency?: string;
  transactionId: string;
}): void {
  fireConversion(LABEL_PURCHASE, {
    value: opts.valueEur,
    currency: opts.currency ?? "EUR",
    transaction_id: opts.transactionId,
  });
}
