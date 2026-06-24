// Vrienden uitnodigen — referral-attributie-cookie (los van de affiliate-cookie).
// First-touch: staat er al een, dan blijft die. 90 dagen, httpOnly.

import { cookies } from "next/headers";

export const REFERRAL_COOKIE_NAME = "ref_user_id";
const REFERRAL_COOKIE_DAYS = 90;

export type ReferralCookieValue = {
  referrerUserId: string;
  code: string;
  setAt: number;
};

export async function setReferralCookie(args: {
  referrerUserId: string;
  code: string;
}): Promise<void> {
  const store = await cookies();
  const existing = store.get(REFERRAL_COOKIE_NAME);
  if (existing) {
    try {
      const parsed = JSON.parse(existing.value) as ReferralCookieValue;
      if (parsed.referrerUserId) return; // first-touch wint
    } catch {
      // corrupt → overschrijven
    }
  }
  const value: ReferralCookieValue = {
    referrerUserId: args.referrerUserId,
    code: args.code,
    setAt: Date.now(),
  };
  store.set(REFERRAL_COOKIE_NAME, JSON.stringify(value), {
    maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getReferralCookie(): Promise<ReferralCookieValue | null> {
  const store = await cookies();
  const raw = store.get(REFERRAL_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.value) as ReferralCookieValue;
    if (!parsed.referrerUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}
