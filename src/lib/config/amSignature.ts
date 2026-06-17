// Dicteren.ai — AM-signature-gegevens voor de funnel-mails.
//
// De funnel-mails gaan via Resend (niet Gmail), dus de Gmail-signature komt niet
// automatisch mee. Deze gegevens vullen de signature in de mail-template, zodat
// 'ie er hetzelfde uitziet als de Gmail-signature van de AM.
//
// Telefoon per AM-e-mailadres. Aanvullen zodra de nummers binnen zijn; een lege
// waarde laat de telefoon weg in de signature (de prospect kan altijd antwoorden,
// reply-to is het AM-adres).

const AM_PHONE: Record<string, string> = {
  "brian@dicteren.ai": "06-41544283",
  // "chris@dicteren.ai": "",
  // "roy@dicteren.ai": "",
  // "lars@dicteren.ai": "",
  // "krishna@dicteren.ai": "",
  // "pi@dicteren.ai": "",
};

export function amPhone(email: string | null | undefined): string | null {
  if (!email) return null;
  return AM_PHONE[email.toLowerCase()] ?? null;
}
