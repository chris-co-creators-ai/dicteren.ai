// Dicteren.ai — Affiliate-attribution cookie helpers
//
// Cookie wordt gezet op /{slug}-route, gelezen in checkout-routes.
// First-touch: als er al een cookie staat, blijft die — tenzij we expliciet
// override (toekomst, niet nu).

import { cookies } from "next/headers";

export const REF_COOKIE_NAME = "ref_aff_id";
const REF_COOKIE_DAYS = 90;

export type RefCookieValue = {
  affiliateId: string;
  source: "slug" | "url-ref";
  setAt: number; // unix ms
};

/** Server-component: zet de attribution-cookie. Doet niets als hij al staat
 *  (first-touch). */
export async function setRefCookie(args: {
  affiliateId: string;
  source: "slug" | "url-ref";
}): Promise<void> {
  const store = await cookies();
  const existing = store.get(REF_COOKIE_NAME);
  if (existing) {
    try {
      const parsed = JSON.parse(existing.value) as RefCookieValue;
      if (parsed.affiliateId) return; // first-touch wins
    } catch {
      // bestaande cookie is corrupt, overschrijf
    }
  }
  const value: RefCookieValue = {
    affiliateId: args.affiliateId,
    source: args.source,
    setAt: Date.now(),
  };
  store.set(REF_COOKIE_NAME, JSON.stringify(value), {
    maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/** Server-component / API-route: lees de attribution-cookie. */
export async function getRefCookie(): Promise<RefCookieValue | null> {
  const store = await cookies();
  const raw = store.get(REF_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.value) as RefCookieValue;
    if (!parsed.affiliateId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Server-side: wis de cookie (bv. na checkout success, of voor admin-impersonation). */
export async function clearRefCookie(): Promise<void> {
  const store = await cookies();
  store.delete(REF_COOKIE_NAME);
}
