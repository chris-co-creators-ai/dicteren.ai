import { redirect } from "next/navigation";
import { getPlanBySlug } from "@/lib/services/order";
import { CheckoutClient } from "./checkout-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Afrekenen — Dicteren.ai" };

type SearchParams = Promise<{ plan?: string }>;

// Eigen checkout-stap tussen /prijzen en Mollie. Toont het plan-overzicht,
// een kortingscode-veld (live gevalideerd) en de methode-keuze. De gekozen
// methode + code gaan naar /api/checkout/consumer, die de payment aanmaakt.
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { plan: planSlug } = await searchParams;
  if (!planSlug) redirect("/prijzen");

  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.customerType !== "consumer" || !plan.isActive) {
    redirect("/prijzen");
  }

  return (
    <CheckoutClient
      planSlug={planSlug}
      planLabel={plan.label}
      listAmountCents={plan.priceCents}
      period={plan.period}
    />
  );
}
