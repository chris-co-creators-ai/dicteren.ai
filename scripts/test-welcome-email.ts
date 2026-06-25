// Dicteren.ai — Self-test voor de partner-welkomstmail.
//
// Draait de e-mail-stap van de publiceer-flow los van de admin-UI, met de echte
// service (geen template-drift) en stap-voor-stap-logging, zodat we exact zien wat
// er in/uit gaat en waar het misgaat.
//
// Draai:  bun --conditions=react-server scripts/test-welcome-email.ts <contactId>
//
// Het stuurt een echte welkomstmail naar het e-mailadres van de contact. De
// magic-link-login wordt door de route gezet (auth.api); hier gebruiken we een
// placeholder-portaal-link, want we testen de mail-inhoud + verzending.

import { config } from "dotenv";
config({ path: ".env.local" });

const contactId = process.argv[2];
if (!contactId) {
  console.error(
    "Usage: bun --conditions=react-server scripts/test-welcome-email.ts <contactId>",
  );
  process.exit(1);
}

const { db } = await import("@/lib/db");
const { crmContacts, affiliates } = await import("@/lib/db/schema");
const { eq } = await import("drizzle-orm");
const { sendPartnerWelcomeEmail } = await import("@/lib/services/email");
const { listDiscountCodesForAffiliate } = await import("@/lib/services/discount");
const { affiliatePublicUrl, emailBase } = await import("@/lib/url");

const step = (m: string, x?: unknown) =>
  console.log(`\n▸ ${m}`, x !== undefined ? x : "");

const [c] = await db
  .select()
  .from(crmContacts)
  .where(eq(crmContacts.id, contactId))
  .limit(1);
if (!c) {
  console.error("Contact niet gevonden:", contactId);
  process.exit(1);
}
step("contact", {
  email: c.email,
  name: c.name,
  promotedAffiliateId: c.promotedAffiliateId,
});
if (!c.email) {
  console.error("Contact heeft geen e-mailadres.");
  process.exit(1);
}
if (!c.promotedAffiliateId) {
  console.error("Contact is niet gepromoot (geen affiliate). Publiceer eerst.");
  process.exit(1);
}

const [a] = await db
  .select()
  .from(affiliates)
  .where(eq(affiliates.id, c.promotedAffiliateId))
  .limit(1);
step("affiliate", { code: a.code, slug: a.slug, status: a.status });

const codes = await listDiscountCodesForAffiliate(a.id);
const base = emailBase();
const params = {
  to: c.email,
  contactName: c.firstName,
  amName: "Test AM",
  amEmail: "licenties@dicteren.ai", // geverifieerd afzender-domein
  contactId: c.id,
  landingUrl: affiliatePublicUrl(a, base),
  discountCode: codes.find((x) => x.isActive)?.code ?? codes[0]?.code ?? null,
  portalUrl: `${base}/affiliate/dashboard`,
  loginUrl: `${base}/affiliate/dashboard`, // placeholder (route zet de magic-link)
};
step("mail-params", params);

step("versturen…");
const result = await sendPartnerWelcomeEmail(params);
step("RESULTAAT", result);
process.exit(result.success ? 0 : 1);
