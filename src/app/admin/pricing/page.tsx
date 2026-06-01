import { and, eq } from "drizzle-orm";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { PricingCalculator } from "./pricing-calculator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marge-calculator · Admin" };

export default async function AdminPricingPage() {
  // Alleen consumer-tarieven uit de DB; zakelijke staffel komt uit pricingTiers.ts.
  const consumerRows = await db
    .select({ period: plans.period, priceCents: plans.priceCents })
    .from(plans)
    .where(and(eq(plans.isActive, true), eq(plans.customerType, "consumer")));

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Marge-calculator</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Kies product en periode, vul marge en seats in. Direct de eindklantprijs,
            partner-commissie, Dicteren-netto en de jaarlijkse recurring voor de reseller.
          </p>
        </div>

        <PricingCalculator
          consumerPlans={consumerRows.map((c) => ({
            period: c.period,
            priceCents: c.priceCents,
          }))}
        />
      </main>
    </>
  );
}
