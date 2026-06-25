// Dicteren.ai — Magic-link-capture voor de partner-welkomstmail.
//
// De Better Auth magic-link-plugin levert de login-URL alleen via z'n
// sendMagicLink-callback. Magic-link wordt NERGENS anders in de app getriggerd dan
// bij het publiceren van een partner, dus de callback betekent altijd: "partner
// gaat live". We vangen de URL hier op zodat de promote-route 'm in onze eigen
// welkomstmail kan zetten (met de AM-context, de slug en de kortingscode) in plaats
// van een losse, kale magic-link-mail. Binnen één request betrouwbaar: signInMagicLink
// await't de callback, daarna leest de route de URL terug.

import "server-only";

let captured: string | null = null;

export function setCapturedMagicLink(url: string): void {
  captured = url;
}

/** Lees de laatst opgevangen magic-link en wis 'm (eenmalig gebruik). */
export function takeCapturedMagicLink(): string | null {
  const url = captured;
  captured = null;
  return url;
}
