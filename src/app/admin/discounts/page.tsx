import { eq, desc } from "drizzle-orm";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { db } from "@/lib/db";
import { affiliates, discountCodes } from "@/lib/db/schema";
import { listAffiliates } from "@/lib/services/affiliate";
import { DiscountsClient } from "./discounts-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kortingen · Admin" };

export default async function AdminDiscountsPage() {
  const [discountsWithAff, affiliateList] = await Promise.all([
    db
      .select({
        id: discountCodes.id,
        code: discountCodes.code,
        type: discountCodes.type,
        value: discountCodes.value,
        appliesTo: discountCodes.appliesTo,
        redemptionCount: discountCodes.redemptionCount,
        maxRedemptions: discountCodes.maxRedemptions,
        isActive: discountCodes.isActive,
        validFrom: discountCodes.validFrom,
        validUntil: discountCodes.validUntil,
        affiliateId: discountCodes.affiliateId,
        affiliateName: affiliates.name,
        createdAt: discountCodes.createdAt,
      })
      .from(discountCodes)
      .leftJoin(affiliates, eq(affiliates.id, discountCodes.affiliateId))
      .orderBy(desc(discountCodes.createdAt)),
    listAffiliates(),
  ]);

  const discounts = discountsWithAff.map((d) => ({
    id: d.id,
    code: d.code,
    type: d.type,
    value: d.value,
    appliesTo: d.appliesTo,
    redemptionCount: d.redemptionCount,
    maxRedemptions: d.maxRedemptions,
    isActive: d.isActive,
    validFrom: d.validFrom?.toISOString() ?? null,
    validUntil: d.validUntil?.toISOString() ?? null,
    affiliateId: d.affiliateId,
    affiliateName: d.affiliateName,
  }));

  const now = new Date();
  const active = discounts.filter(
    (d) => d.isActive && (!d.validUntil || new Date(d.validUntil) >= now),
  ).length;
  const expired = discounts.filter(
    (d) => d.validUntil && new Date(d.validUntil) < now,
  ).length;
  const redemptions = discounts.reduce((s, d) => s + d.redemptionCount, 0);
  const affiliateCount = discounts.filter((d) => d.affiliateId).length;

  const kpis = [
    {
      label: "Actieve codes",
      value: String(active),
      detail: `${expired} verlopen`,
    },
    {
      label: "Inlossingen",
      value: String(redemptions),
      detail: discounts.length
        ? `${discounts.length} codes totaal`
        : "Nog geen codes",
    },
    {
      label: "Affiliate-codes",
      value: String(affiliateCount),
      detail: `${discounts.length - affiliateCount} algemeen`,
    },
    {
      label: "Onbeperkt",
      value: String(discounts.filter((d) => d.maxRedemptions === null).length),
      detail: "Zonder max-gebruik",
    },
  ];

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Kortingen
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Algemene + affiliate-gekoppelde codes. Inlossingen worden geteld
            via Mollie-webhook bij paid order.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {k.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">
                {k.value}
              </div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {k.detail}
              </div>
            </div>
          ))}
        </div>

        <DiscountsClient
          discounts={discounts}
          affiliates={affiliateList.map((a) => ({
            id: a.id,
            name: a.name,
            code: a.code,
          }))}
        />
      </div>
    </>
  );
}
