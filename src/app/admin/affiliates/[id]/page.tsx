import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import {
  getAffiliateById,
  getAffiliateStats,
  listAffiliateReferrals,
  listAffiliateCommissions,
} from "@/lib/services/affiliate";
import { CommissionRowActions } from "./commission-row-actions";

export const dynamic = "force-dynamic";

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Params = Promise<{ id: string }>;

export default async function AffiliateDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const affiliate = await getAffiliateById(id);
  if (!affiliate) notFound();

  const stats = await getAffiliateStats(id);
  const referrals = await listAffiliateReferrals(id);
  const commissions = await listAffiliateCommissions(id);

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <Link
          href="/admin/affiliates"
          className="text-xs font-semibold text-muted-foreground hover:underline"
        >
          ← Terug naar affiliates
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-bold">{affiliate.name}</h1>
          <p className="text-sm text-muted-foreground">
            Code: <span className="font-mono">{affiliate.code}</span>
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <KPI label="Referrals" value={String(stats.referralCount)} />
          <KPI label="Geconverteerd" value={String(stats.convertedCount)} />
          <KPI label="Pending" value={eur(stats.pendingCents)} />
          <KPI label="Payable" value={eur(stats.payableCents)} />
          <KPI label="Uitbetaald" value={eur(stats.paidCents)} />
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-bold">Commissie-overzicht</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Basis</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Commissie</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nog geen commissies.
                    </td>
                  </tr>
                )}
                {commissions.map(({ commission, licenseCode }) => (
                  <tr key={commission.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs">
                      {commission.createdAt.toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {commission.orderId?.slice(0, 8) ?? "—"}
                      {licenseCode && (
                        <div className="text-[0.6875rem] text-muted-foreground">
                          {licenseCode}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {eur(commission.basisAmountCents)}
                    </td>
                    <td className="px-4 py-3 text-xs">{commission.seats}</td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {eur(commission.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-xs">{commission.status}</td>
                    <td className="px-4 py-3">
                      <CommissionRowActions
                        affiliateId={id}
                        commissionId={commission.id}
                        status={commission.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold">Aangedragen klanten</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Klant</th>
                  <th className="px-4 py-3">Eerste klik</th>
                  <th className="px-4 py-3">Eerste order</th>
                  <th className="px-4 py-3">Org</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {referrals.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nog geen referrals.
                    </td>
                  </tr>
                )}
                {referrals.map((r) => (
                  <tr key={r.referralId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.userName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.userEmail ?? r.userId.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.firstSeenAt.toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.convertedAt
                        ? r.convertedAt.toLocaleDateString("nl-NL")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.organizationId?.slice(0, 8) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-bold">Affiliate-link</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Deel deze link met klanten. Bij signup wordt de klant lifetime aan
            jou gekoppeld.
          </p>
          <div className="mt-3 rounded-md bg-muted/40 p-3 font-mono text-xs">
            https://www.dicteren.ai/zakelijk/start?ref={affiliate.code}
          </div>
        </section>
      </main>
    </>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
