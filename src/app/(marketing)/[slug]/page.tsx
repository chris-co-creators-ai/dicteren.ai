// Dicteren.ai — Affiliate slug-landingspagina
//
// Catch-all op marketing-niveau. Concrete routes (/prijzen, /download, etc.)
// hebben voorrang. Reserved-slugs vallen niet in deze catch (Next.js dynamic
// segment matched alleen wat niet concreet is gerouteerd).
//
// Flow:
//   1. Lookup affiliates.slug = $slug AND status = 'active'
//   2. Niet gevonden? notFound() → Next 404
//   3. Gevonden? setRefCookie (first-touch) + render de gedeelde
//      <AffiliateLanding> (zelfde presentatie als de AM-preview bij stap 6).

import { notFound } from "next/navigation";
import { getAffiliateBySlug } from "@/lib/services/affiliateSlug";
import { AffiliateLanding } from "@/components/affiliate/affiliate-landing";
import { RefTracker } from "./ref-tracker";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const affiliate = await getAffiliateBySlug(slug);
  // Nooit indexeren: anders vinden mensen die de affiliate zoeken Dicteren.ai via
  // deze pagina en betalen we commissie op een klant die toch al was binnengekomen.
  const noindex = { index: false, follow: false } as const;
  if (!affiliate || affiliate.status !== "active") {
    return { title: "Niet gevonden · Dicteren.ai", robots: noindex };
  }
  const displayName = affiliate.displayName ?? affiliate.name;
  return {
    title: `Doorverwezen door ${displayName} · Dicteren.ai`,
    description: `${displayName} raadt Dicteren.ai aan. Praat. En het staat er, in elke app — Nederlands, lokaal.`,
    robots: noindex,
  };
}

export default async function AffiliateSlugPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const affiliate = await getAffiliateBySlug(slug);
  if (!affiliate || affiliate.status !== "active") {
    notFound();
  }

  // First-touch ref-cookie wordt client-side gezet via een route-handler
  // (Next 16 staat cookies().set() niet toe tijdens een page-render).
  const displayName = affiliate.displayName ?? affiliate.name;
  const hasConsumer =
    affiliate.consumerCommissionType !== null &&
    (affiliate.consumerCommissionPct > 0 ||
      affiliate.consumerCommissionFixedCents > 0);
  const hasBusiness =
    affiliate.businessCommissionType !== null &&
    (affiliate.businessCommissionPct > 0 ||
      affiliate.businessCommissionFixedCents > 0);

  return (
    <>
      <RefTracker affiliateId={affiliate.id} />
      <AffiliateLanding
        brand={{
          displayName,
          brandColor: affiliate.brandColor,
          brandLogoUrl: affiliate.brandLogoUrl,
          welcomeMessage: affiliate.welcomeMessage,
          hasConsumer,
          hasBusiness,
        }}
      />
    </>
  );
}
