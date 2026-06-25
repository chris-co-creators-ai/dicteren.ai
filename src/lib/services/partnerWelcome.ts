// Dicteren.ai — De partner-welkomstmail bouwen + sturen voor een gepubliceerde
// partner. Eén bron, gebruikt door zowel het publiceren (promote-reseller) als de
// "opnieuw sturen"-knop. Doet: account zeker stellen + koppelen, een één-klik
// magic-link genereren, de slug-URL + kortingscode ophalen, en de mail sturen.
// Logt elke stap (Vercel runtime-logs). De magic-link vereist request-headers.

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmContacts, affiliates } from "@/lib/db/schema";
import { auth } from "@/lib/auth/server";
import { takeCapturedMagicLink } from "@/lib/auth/magicLinkCapture";
import { ensurePartnerAuthAccount } from "./partnerAccount";
import { listDiscountCodesForAffiliate } from "./discount";
import { sendPartnerWelcomeEmail } from "./email";
import { affiliatePublicUrl, emailBase } from "@/lib/url";

export async function sendPartnerWelcome(opts: {
  contactId: string;
  amName: string;
  amEmail: string;
  headers: Headers;
}): Promise<{ ok: boolean; error?: string }> {
  const log = (m: string, x?: unknown) =>
    console.log(`[partner-welcome ${opts.contactId}] ${m}`, x ?? "");

  const [c] = await db
    .select({
      email: crmContacts.email,
      firstName: crmContacts.firstName,
      name: crmContacts.name,
      companyName: crmContacts.companyName,
      promotedAffiliateId: crmContacts.promotedAffiliateId,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, opts.contactId))
    .limit(1);
  if (!c?.email) return { ok: false, error: "Contact heeft geen e-mailadres" };
  if (!c.promotedAffiliateId)
    return { ok: false, error: "Partner is nog niet gepubliceerd" };

  const [a] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, c.promotedAffiliateId))
    .limit(1);
  if (!a) return { ok: false, error: "Affiliate niet gevonden" };

  const base = emailBase();
  const partnerName = c.companyName?.trim() || c.name || "Partner";

  // Account zeker stellen + aan de affiliate koppelen.
  let account: { userId: string; created: boolean } | null = null;
  try {
    account = await ensurePartnerAuthAccount(c.email, partnerName);
    log(
      account
        ? `account ${account.created ? "aangemaakt" : "bestond al"}: ${account.userId}`
        : "account null (ongeldig e-mailadres)",
    );
  } catch (e) {
    log("account-stap FAALDE", e instanceof Error ? e.message : e);
  }

  let loginUrl: string | null = null;
  if (account) {
    try {
      await db
        .update(affiliates)
        .set({ userId: account.userId, updatedAt: new Date() })
        .where(eq(affiliates.id, a.id));
    } catch (e) {
      log("koppeling overgeslagen (al gekoppeld?)", e instanceof Error ? e.message : e);
    }
    try {
      await auth.api.signInMagicLink({
        headers: opts.headers,
        body: { email: c.email, callbackURL: `${base}/affiliate/dashboard` },
      });
      loginUrl = takeCapturedMagicLink();
      log(loginUrl ? "magic-link gegenereerd" : "magic-link LEEG");
    } catch (e) {
      log("magic-link FAALDE", e instanceof Error ? e.message : e);
    }
  }

  const codes = await listDiscountCodesForAffiliate(a.id);
  const discountCode =
    codes.find((x) => x.isActive)?.code ?? codes[0]?.code ?? null;

  const sent = await sendPartnerWelcomeEmail({
    to: c.email,
    contactName: c.firstName ?? null,
    amName: opts.amName,
    amEmail: opts.amEmail,
    contactId: opts.contactId,
    landingUrl: affiliatePublicUrl(a, base),
    discountCode,
    portalUrl: `${base}/affiliate/dashboard`,
    loginUrl,
  });
  const error = sent.success ? undefined : sent.error;
  log(sent.success ? "welkomstmail verstuurd" : `welkomstmail FAALDE: ${error}`);
  return { ok: sent.success, error };
}
