// Dicteren.ai — URL helpers
//
// appBase() leest NEXT_PUBLIC_APP_URL (productie = https://www.dicteren.ai,
// lokaal = http://localhost:3000) en stript een trailing slash.
// webhookUrlFor(base) returnt undefined op localhost (Mollie weigert
// onbereikbare webhook-URLs met 422).

export function appBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function webhookUrlFor(base: string, path = "/api/mollie/webhook"): string | undefined {
  if (/localhost|127\.0\.0\.1/.test(base)) return undefined;
  return `${base}${path}`;
}

/** Base-URL voor email-templates. Altijd productie, ongeacht waar de code
 *  draait — anders krijgen test-mails localhost-URLs en logo's die niet laden. */
export function emailBase(): string {
  return (
    process.env.EMAIL_BASE_URL?.replace(/\/$/, "") ??
    "https://www.dicteren.ai"
  );
}
