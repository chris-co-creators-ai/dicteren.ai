import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPricing } from "@/lib/services/pricing";
import type { BillingPeriod } from "@/lib/services/pricingTiers";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zakelijke licenties starten · Dicteren.ai" };

/** org-monthly/quarterly/yearly → periode. Default jaar. */
function periodFromSlug(slug: string | undefined): BillingPeriod {
  if (slug === "org-monthly") return "monthly";
  if (slug === "org-quarterly") return "quarterly";
  return "yearly";
}

type SearchParams = Promise<{
  plan?: string;
  seats?: string;
  ref?: string;
  code?: string;
  from?: string;
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
    from,
  } = await searchParams;
  const upgradeFromConsumer = from === "consumer_upgrade";
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

  const pricing = await getPricing();
  const initialPeriod = periodFromSlug(planSlug);
  const seats = Math.min(
    pricing.customQuoteFrom - 1,
    Math.max(1, Number(seatsParam ?? 1) || 1),
  );

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
          pricing={pricing}
          initialPeriod={initialPeriod}
          initialSeats={seats}
          affiliateCode={ref ?? null}
          initialDiscountCode={code ?? null}
          defaultBillingEmail={session.user.email}
          upgradeFromConsumer={upgradeFromConsumer}
        />
      </div>
    </main>
  );
}
