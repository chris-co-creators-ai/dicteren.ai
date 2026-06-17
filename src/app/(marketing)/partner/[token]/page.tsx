// Dicteren.ai — Publieke reseller-deck-pagina op /partner/[token].
//
// De AM stuurt deze link. Het bezoek logt zich (warm-trigger), de prospect ziet
// het deck en kan zich aanmelden. Niet geïndexeerd (werving, geen PII in de URL
// behalve de niet-raadbare token). "partner" staat in RESERVED_SLUGS, dus deze
// concrete route botst niet met de affiliate-catch-all /[slug].

import { notFound } from "next/navigation";
import { getContactByDeckToken } from "@/lib/services/partnerFunnel";
import { PartnerDeck } from "@/components/partners/partner-deck";
import { DeckVisitTracker } from "./deck-visit-tracker";
import { PartnerApplyForm } from "./partner-apply-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { token } = await params;
  const contact = await getContactByDeckToken(token);
  if (!contact) return { title: "Niet gevonden · Dicteren.ai" };
  return {
    title: "Word partner van Dicteren.ai",
    description: "Het partnerprogramma van Dicteren.ai.",
    robots: { index: false, follow: false },
  };
}

export default async function PartnerDeckPage({
  params,
}: {
  params: Params;
}) {
  const { token } = await params;
  const contact = await getContactByDeckToken(token);
  if (!contact) notFound();

  const firstName =
    contact.firstName ?? contact.name?.split(" ")[0] ?? null;
  const audience = contact.niche ?? contact.industry ?? null;

  return (
    <>
      <DeckVisitTracker token={token} />
      <PartnerDeck firstName={firstName} audience={audience} />
      <section
        id="aanmelden"
        className="mx-auto max-w-3xl px-4 pb-24 sm:px-6"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-[color:var(--navy)]">
          Ja, ik wil partner worden
        </h2>
        {contact.appliedAt ? (
          <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-8 text-center text-[color:var(--text-muted)]">
            Je aanmelding staat al bij ons. We nemen contact met je op.
          </div>
        ) : (
          <PartnerApplyForm token={token} companyName={contact.companyName} />
        )}
      </section>
    </>
  );
}
