// Dicteren.ai — Email-normalisatie + disposable-block.
//
// Sluit drie misbruik-paden af:
//   1. Gmail dot-trick: j.a.n@gmail.com = jan@gmail.com
//   2. Plus-aliassen op alle providers: jan+abc@x.com = jan@x.com
//   3. Wegwerp-inboxes (mailinator, 10minutemail, etc.)
//
// Voor DB-vergelijking gebruik je `normalizeEmail()` en sla je het resultaat
// op in `auth.user.email_normalized` met UNIQUE INDEX. Dan zijn aliassen
// onmogelijk te misbruiken voor dubbele accounts of trial-spam.

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// Top wegwerp-email-domains. Niet exhaustive — Christian kan uitbreiden zonder
// rebuild via env-var DISPOSABLE_EMAIL_EXTRA (comma-separated) in de toekomst.
const DISPOSABLE_DOMAINS = new Set<string>([
  // Mainstream wegwerp
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "guerrillamail.de",
  "throwaway.email",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "sharklasers.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.de",
  "trashmail.io",
  "maildrop.cc",
  "getairmail.com",
  "burnermail.io",
  "fakeinbox.com",
  "tempinbox.com",
  "tempinbox.us",
  "spamgourmet.com",
  "spam4.me",
  "mintemail.com",
  "incognitomail.com",
  "fakemail.net",
  "dispostable.com",
  "easytrashmail.com",
  "moakt.com",
  "mohmal.com",
  "33mail.com",
  "deadaddress.com",
  "discard.email",
  "instantemailaddress.com",
  "tempr.email",
  "tempmail.ninja",
  "tempm.com",
  "tempemails.io",
  "mailcatch.com",
  "mailnesia.com",
  // Nederlandse / NL-gerichte wegwerp-providers
  "wegwerpmail.nl",
  "wegwerpemail.nl",
  "nepmail.nl",
  "tijdelijkmail.nl",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase());
}

/** Normaliseer email zodat plus/dot-aliassen op dezelfde rij landen.
 *  Veilig om altijd toe te passen. Returnt lowercase. */
export function normalizeEmail(raw: string): string {
  const lower = raw.trim().toLowerCase();
  const atIdx = lower.lastIndexOf("@");
  if (atIdx <= 0 || atIdx === lower.length - 1) {
    return lower; // ongeldige email, laat as-is — validator vangt 'm
  }
  let local = lower.slice(0, atIdx);
  const domain = lower.slice(atIdx + 1);

  // Strip plus-suffix op alle providers.
  const plusIdx = local.indexOf("+");
  if (plusIdx >= 0) {
    local = local.slice(0, plusIdx);
  }

  // Gmail/Googlemail: strip dots in local-part + normaliseer googlemail → gmail.
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
    return `${local}@gmail.com`;
  }

  return `${local}@${domain}`;
}

/** Check of het domein op de wegwerp-lijst staat. */
export function isDisposableEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  const atIdx = lower.lastIndexOf("@");
  if (atIdx < 0) return false;
  const domain = lower.slice(atIdx + 1);
  return DISPOSABLE_DOMAINS.has(domain);
}

/** Combineert: format-check + disposable-check + normalize. Returnt
 *  ofwel `{ok: true, normalized}` ofwel `{ok: false, reason}`. */
export function validateAndNormalizeEmail(raw: string):
  | { ok: true; normalized: string; raw: string }
  | { ok: false; reason: "invalid_format" | "disposable" } {
  const trimmed = raw.trim().toLowerCase();
  if (!isValidEmailFormat(trimmed)) {
    return { ok: false, reason: "invalid_format" };
  }
  if (isDisposableEmail(trimmed)) {
    return { ok: false, reason: "disposable" };
  }
  return { ok: true, normalized: normalizeEmail(trimmed), raw: trimmed };
}
