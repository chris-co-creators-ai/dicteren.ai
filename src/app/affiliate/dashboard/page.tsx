import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getAffiliateByUserId,
  getAffiliateStats,
  listAffiliateReferrals,
  listAffiliateCommissions,
} from "@/lib/services/affiliate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn affiliate-dashboard · Dicteren.ai" };

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AffiliateDashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in?next=/affiliate/dashboard");

  const affiliate = await getAffiliateByUserId(session.user.id);
  if (!affiliate) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold">Geen affiliate-account</h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Je account is niet gekoppeld aan een affiliate-profiel. Mail{" "}
          <a
            href="mailto:info@dicteren.ai"
            className="underline"
          >
            info@dicteren.ai
          </a>{" "}
          om reseller te worden.
        </p>
      </main>
    );
  }

  const stats = await getAffiliateStats(affiliate.id);
  const referrals = await listAffiliateReferrals(affiliate.id);
  const commissions = await listAffiliateCommissions(affiliate.id);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://www.dicteren.ai";
  const affiliateLink = `${baseUrl}/zakelijk/start?ref=${affiliate.code}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        Dashboard — {affiliate.name}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        Status: {affiliate.status} · Commissie:{" "}
        {affiliate.commissionType === "percentage"
          ? `${affiliate.commissionPct}% per order`
          : `${eur(affiliate.commissionFixedCents)} per seat`}
      </p>

      <section className="mt-7 rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
        <h2 className="text-lg font-bold">Jouw affiliate-link</h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Deel deze link. Klanten die via deze link kopen worden lifetime aan
          jou gekoppeld voor commissie.
        </p>
        <div className="mt-3 break-all rounded-md bg-[color:var(--bg)] p-3 font-mono text-xs">
          {affiliateLink}
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <KPI label="Referrals" value={String(stats.referralCount)} />
        <KPI label="Geconverteerd" value={String(stats.convertedCount)} />
        <KPI label="Openstaand" value={eur(stats.pendingCents + stats.payableCents)} />
        <KPI label="Uitbetaald" value={eur(stats.paidCents)} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Recente commissies</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-[color:var(--bg)] text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Basis</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Commissie</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-soft)]">
              {commissions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[color:var(--text-muted)]"
                  >
                    Nog geen commissies.
                  </td>
                </tr>
              )}
              {commissions.slice(0, 30).map(({ commission }) => (
                <tr key={commission.id}>
                  <td className="px-4 py-3 text-xs">
                    {commission.createdAt.toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {eur(commission.basisAmountCents)}
                  </td>
                  <td className="px-4 py-3 text-xs">{commission.seats}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {eur(commission.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-xs">{commission.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Aangedragen klanten</h2>
        <ul className="mt-3 divide-y divide-[color:var(--border-soft)] rounded-2xl border border-[color:var(--border-soft)] bg-white">
          {referrals.length === 0 && (
            <li className="p-6 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen referrals — deel je link op LinkedIn, in nieuwsbrieven of
              direct met klanten.
            </li>
          )}
          {referrals.slice(0, 30).map((r) => (
            <li key={r.referralId} className="flex justify-between p-4 text-sm">
              <div>
                <div className="font-medium">{r.userName ?? "Onbekend"}</div>
                <div className="text-xs text-[color:var(--text-muted)]">
                  {r.userEmail ?? "—"}
                </div>
              </div>
              <div className="text-right text-xs text-[color:var(--text-muted)]">
                {r.convertedAt ? (
                  <span className="text-[color:var(--green)]">
                    Geconverteerd · {r.convertedAt.toLocaleDateString("nl-NL")}
                  </span>
                ) : (
                  <span>
                    Sinds {r.firstSeenAt.toLocaleDateString("nl-NL")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-xs text-[color:var(--text-soft)]">
        Vragen over je uitbetaling? Mail{" "}
        <a href="mailto:info@dicteren.ai" className="underline">
          info@dicteren.ai
        </a>
        .
      </p>
    </main>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-4">
      <div className="text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}
