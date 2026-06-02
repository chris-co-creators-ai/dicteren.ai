import { getSession } from "@/lib/auth/session";
import { BusinessTrialForm } from "./business-trial-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Start je zakelijke proefperiode · Dicteren.ai",
};

type SearchParams = Promise<{ am?: string; reseller?: string }>;

export default async function ZakelijkTrialPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { am, reseller } = await searchParams;
  const session = await getSession();

  // Ref-params (am / reseller) over de sign-up heen behouden.
  const nextWithRef =
    `/zakelijk/trial` +
    (am ? `?am=${encodeURIComponent(am)}` : "") +
    (reseller ? `${am ? "&" : "?"}reseller=1` : "");

  return (
    <main
      className="flex min-h-screen flex-col items-center px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-2xl">
        <a
          href="/prijzen"
          className="mb-6 inline-flex text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
        >
          ← Terug naar prijzen
        </a>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Probeer Dicteren.ai zakelijk — 14 dagen gratis
        </h1>
        <p className="mt-3 text-base text-[color:var(--text-muted)]">
          Vul je bedrijfsgegevens in en test meteen. Geen betaling nodig. Bij
          upgraden koop je seats voor je team tegen de zakelijke staffel.
        </p>

        <BusinessTrialForm
          isLoggedIn={Boolean(session?.user)}
          signUpHref={`/auth/sign-up?next=${encodeURIComponent(nextWithRef)}`}
          amUserId={am ?? null}
          reseller={reseller === "1"}
        />
      </div>
    </main>
  );
}
