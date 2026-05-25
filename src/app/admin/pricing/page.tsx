import { eq, desc } from "drizzle-orm";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { db } from "@/lib/db";
import { plans, discountCodes, affiliates } from "@/lib/db/schema";
import { PricingCalculator } from "./pricing-calculator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prijzen & marge · Admin" };

export default async function AdminPricingPage() {
  const [planRows, discountRows, affiliateRows] = await Promise.all([
    db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(plans.customerType, plans.period),
    db.select().from(discountCodes).where(eq(discountCodes.isActive, true)),
    db
      .select()
      .from(affiliates)
      .orderBy(desc(affiliates.createdAt)),
  ]);

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Prijzen & marge-calculator</h1>
          <p className="text-sm text-muted-foreground">
            Bereken eindklantprijs, affiliate-commissie, account-manager-commissie
            en Dicteren-netto-marge. Dicteren-doel: altijd minimaal 25% netto.
          </p>
        </div>

        <PricingCalculator
          plans={planRows.map((p) => ({
            id: p.id,
            slug: p.slug,
            label: p.label,
            customerType: p.customerType,
            period: p.period,
            priceCents: p.priceCents,
            isPerSeat: p.isPerSeat,
            currency: p.currency,
          }))}
          discountCodes={discountRows.map((d) => ({
            id: d.id,
            code: d.code,
            type: d.type,
            value: d.value,
            appliesTo: d.appliesTo,
            minimumSeats: d.minimumSeats,
            maxRedemptions: d.maxRedemptions,
            redemptionCount: d.redemptionCount,
            affiliateId: d.affiliateId,
          }))}
          affiliates={affiliateRows.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            status: a.status,
            commissionType: a.commissionType,
            commissionPct: a.commissionPct,
            commissionFixedCents: a.commissionFixedCents,
          }))}
        />
      </main>
    </>
  );
}
