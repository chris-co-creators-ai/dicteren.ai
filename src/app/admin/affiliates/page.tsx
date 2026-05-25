import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { listAffiliates } from "@/lib/services/affiliate";
import { AffiliateCreateForm } from "./affiliate-create-form";

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

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Affiliates</h1>
            <p className="text-sm text-muted-foreground">
              Commerciële resellers en hun commissies
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-5" strokeWidth={2.2} />
            <span className="text-sm font-semibold">
              {affiliates.length} affiliates
            </span>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Plus className="size-4" strokeWidth={2.2} />
            Nieuwe affiliate aanmaken
          </h2>
          <AffiliateCreateForm />
        </section>

        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Commissie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Verdiend</th>
                <th className="px-4 py-3 text-right">Uitbetaald</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {affiliates.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nog geen affiliates aangemaakt.
                  </td>
                </tr>
              )}
              {affiliates.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.contactEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                  <td className="px-4 py-3 text-xs">
                    {a.commissionType === "percentage"
                      ? `${a.commissionPct}% per order`
                      : `${eur(a.commissionFixedCents)} per seat`}
                  </td>
                  <td className="px-4 py-3 text-xs">{a.status}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {eur(a.totalEarnedCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {eur(a.totalPaidCents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/affiliates/${a.id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Beheren →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
