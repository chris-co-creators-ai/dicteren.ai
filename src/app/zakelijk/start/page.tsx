import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPlanBySlug } from "@/lib/services/order";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zakelijke licenties starten · Dicteren.ai" };

type SearchParams = Promise<{
  plan?: string;
  seats?: string;
  ref?: string;
  code?: string;
}>;

export default async function ZakelijkStartPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const {
    plan: planSlug,
    seats: seatsParam,
    ref,
    code,
  } = await searchParams;
  const session = await getSession();

  if (!session?.user) {
    const nextUrl = `/zakelijk/start${
      planSlug || seatsParam || ref || code
        ? `?${new URLSearchParams({
            ...(planSlug ? { plan: planSlug } : {}),
            ...(seatsParam ? { seats: seatsParam } : {}),
            ...(ref ? { ref } : {}),
            ...(code ? { code } : {}),
          }).toString()}`
        : ""
    }`;
    redirect(`/auth/sign-up?next=${encodeURIComponent(nextUrl)}`);
  }

  const requestedSlug = planSlug ?? "team-jaar";
  const plan = await getPlanBySlug(requestedSlug);
  const seats = Math.min(49, Math.max(1, Number(seatsParam ?? 1) || 1));

  if (!plan || plan.customerType !== "organization" || !plan.isActive) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold">Plan niet beschikbaar</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Het geselecteerde zakelijke plan bestaat niet of is gedeactiveerd.
          Ga terug naar de prijzenpagina om een plan te kiezen.
        </p>
        <a href="/prijzen" className="btn btn-primary mt-6 inline-flex">
          Naar prijzen
        </a>
      </main>
    );
  }

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
          Start je zakelijke licenties
        </h1>
        <p className="mt-3 text-base text-[color:var(--text-muted)]">
          Vul je bedrijfsgegevens in. Je wordt automatisch eigenaar van de
          organisatie en kunt daarna teamleden uitnodigen.
        </p>

        <CheckoutForm
          planSlug={plan.slug}
          planLabel={plan.label}
          planPriceCents={plan.priceCents}
          planPeriod={plan.period}
          initialSeats={seats}
          affiliateCode={ref ?? null}
          initialDiscountCode={code ?? null}
          defaultBillingEmail={session.user.email}
        />
      </div>
    </main>
  );
}
