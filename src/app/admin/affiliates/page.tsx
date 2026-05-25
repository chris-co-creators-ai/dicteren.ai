import Link from "next/link";
import { Users } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { listAffiliates } from "@/lib/services/affiliate";
import { AffiliatesIndexClient } from "./affiliates-index-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Affiliates · Admin" };

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminAffiliatesPage() {
  const affiliates = await listAffiliates();

  const totalEarned = affiliates.reduce((s, a) => s + a.totalEarnedCents, 0);
  const totalPaid = affiliates.reduce((s, a) => s + a.totalPaidCents, 0);
  const totalOpen = totalEarned - totalPaid;
  const activeCount = affiliates.filter((a) => a.status === "active").length;

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Affiliates</h1>
            <p className="text-sm text-muted-foreground">
              Commerciële resellers en hun commissies — beheer + uitbetalingen
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-5" strokeWidth={2.2} />
            <span className="text-sm font-semibold">
              {affiliates.length} affiliates ({activeCount} actief)
            </span>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <KPI label="Aantal" value={String(affiliates.length)} detail={`${activeCount} actief`} />
          <KPI label="Totaal verdiend" value={eur(totalEarned)} detail="Lifetime cumulatief" />
          <KPI label="Openstaand" value={eur(totalOpen)} detail="Nog uit te betalen" />
          <KPI label="Uitbetaald" value={eur(totalPaid)} detail="Lifetime uitbetaald" />
        </div>

        <AffiliatesIndexClient
          affiliates={affiliates.map((a) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            contactEmail: a.contactEmail,
            status: a.status,
            commissionType: a.commissionType,
            commissionPct: a.commissionPct,
            commissionFixedCents: a.commissionFixedCents,
            totalEarnedCents: a.totalEarnedCents,
            totalPaidCents: a.totalPaidCents,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </main>
    </>
  );
}

function KPI({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[0.6875rem] text-muted-foreground">{detail}</div>
    </div>
  );
}
