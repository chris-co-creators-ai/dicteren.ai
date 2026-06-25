// Dicteren.ai — AM-preview van de partner-landingpagina (stap 6, vóór publiceren).
//
// De affiliate bestaat nog niet (publiceren maakt 'm pas), dus we renderen de
// gedeelde <AffiliateLanding> uit de aangeleverde brand-identity op de crm_contact.
// Zo ziet de AM exact wat live gaat, en klikt 'ie daarna pas op publiceren. Staff-only.

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminOrManager } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { crmContacts } from "@/lib/db/schema";
import { signDownload } from "@/lib/services/r2";
import { AffiliateLanding } from "@/components/affiliate/affiliate-landing";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Preview landingpagina · Dicteren.ai",
  robots: { index: false, follow: false },
};

type Params = Promise<{ contactId: string }>;

export default async function LandingPreviewPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminOrManager();
  const { contactId } = await params;

  const [contact] = await db
    .select({
      name: crmContacts.name,
      companyName: crmContacts.companyName,
      appliedBrandColor: crmContacts.appliedBrandColor,
      appliedQuote: crmContacts.appliedQuote,
      appliedLogoR2Key: crmContacts.appliedLogoR2Key,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!contact) notFound();

  // Logo-intake-key → tijdelijke signed URL (de bucket is niet publiek). Faalt R2,
  // dan tonen we de pagina zonder logo i.p.v. de hele preview te breken.
  let brandLogoUrl: string | null = null;
  if (contact.appliedLogoR2Key) {
    try {
      brandLogoUrl = await signDownload(contact.appliedLogoR2Key);
    } catch {
      brandLogoUrl = null;
    }
  }

  const displayName = contact.companyName?.trim() || contact.name;

  return (
    <main className="bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-center gap-2 bg-[color:var(--navy)] px-4 py-2.5 text-center text-xs font-semibold text-white">
        Preview — deze pagina is nog niet gepubliceerd. Zo ziet 'm eruit zodra je
        op publiceren klikt.
      </div>
      <AffiliateLanding
        brand={{
          displayName,
          brandColor: contact.appliedBrandColor,
          brandLogoUrl,
          welcomeMessage: contact.appliedQuote,
          // Commissie is nog niet geconfigureerd; toon de volledige pagina (D-2).
          hasConsumer: true,
          hasBusiness: true,
        }}
      />
    </main>
  );
}
