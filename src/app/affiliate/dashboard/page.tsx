import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliatePayouts } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import {
  getAffiliateByUserId,
  getAffiliateStats,
  listAffiliateReferrals,
  listAffiliateCommissions,
} from "@/lib/services/affiliate";
import { emailBase } from "@/lib/url";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn affiliate-dashboard · Dicteren.ai" };

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTH_NAMES = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
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
          <a href="mailto:info@dicteren.ai" className="underline">
            info@dicteren.ai
          </a>{" "}
          om reseller te worden.
        </p>
      </main>
    );
  }

  if (affiliate.status === "pending") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <span className="chip chip-navy">In behandeling</span>
        <h1 className="mt-4 text-2xl font-bold">
          Je aanmelding wordt beoordeeld
        </h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Zodra we je hebben goedgekeurd krijg je een mail met je partner-link
          en kun je hier inloggen.
        </p>
      </main>
    );
  }

  const stats = await getAffiliateStats(affiliate.id);
  const referrals = await listAffiliateReferrals(affiliate.id);
  const commissions = await listAffiliateCommissions(affiliate.id);
  const payouts = await db
    .select()
    .from(affiliatePayouts)
    .where(eq(affiliatePayouts.affiliateId, affiliate.id))
    .orderBy(desc(affiliatePayouts.scheduledAt))
    .limit(12);

  const baseUrl = emailBase();
  const affiliateLink = affiliate.slug
    ? `${baseUrl}/${affiliate.slug}`
    : `${baseUrl}/zakelijk/start?ref=${affiliate.code}`;

  const hasConsumer =
    affiliate.consumerCommissionType !== null &&
    (affiliate.consumerCommissionPct > 0 ||
      affiliate.consumerCommissionFixedCents > 0);
  const hasBusiness =
    affiliate.businessCommissionType !== null &&
    (affiliate.businessCommissionPct > 0 ||
      affiliate.businessCommissionFixedCents > 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        Dashboard — {affiliate.displayName ?? affiliate.name}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--text-muted)]">
        Status: {affiliate.status}
      </p>

      <section className="mt-7 rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
        <h2 className="text-lg font-bold">Jouw partner-link</h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Deel deze link. Klanten worden 90 dagen aan jou gekoppeld via een
          cookie. Daarna lifetime via referral-record in de DB.
        </p>
        <div className="mt-3 break-all rounded-md bg-[color:var(--bg)] p-3 font-mono text-xs">
          {affiliateLink}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <ConfigCard
          title="Persoonlijke aankopen"
          enabled={hasConsumer}
          type={affiliate.consumerCommissionType}
          pct={affiliate.consumerCommissionPct}
          fixed={affiliate.consumerCommissionFixedCents}
          duration={affiliate.consumerCommissionDurationMonths}
          recurringPct={affiliate.consumerRecurringCommissionPct}
        />
        <ConfigCard
          title="Zakelijke aankopen"
          enabled={hasBusiness}
          type={affiliate.businessCommissionType}
          pct={affiliate.businessCommissionPct}
          fixed={affiliate.businessCommissionFixedCents}
          duration={affiliate.businessCommissionDurationMonths}
          recurringPct={affiliate.businessRecurringCommissionPct}
        />
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <KPI label="Referrals" value={String(stats.referralCount)} />
        <KPI label="Geconverteerd" value={String(stats.convertedCount)} />
        <KPI
          label="Openstaand"
          value={eur(stats.pendingCents + stats.payableCents)}
        />
        <KPI label="Uitbetaald" value={eur(stats.paidCents)} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Uitbetalingen</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-[color:var(--bg)] text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Periode</th>
                <th className="px-4 py-3 text-right">Bedrag</th>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uitbetaald</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-soft)]">
              {payouts.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[color:var(--text-muted)]"
                  >
                    Nog geen payouts. Op de 25e van de maand stellen we de
                    eerste samen.
                  </td>
                </tr>
              )}
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-xs">
                    {MONTH_NAMES[p.periodMonth - 1]} {p.periodYear}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                    {eur(p.totalCents)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {p.commissionCount}
                  </td>
                  <td className="px-4 py-3 text-xs">{p.status}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(p.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Recente commissies</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[color:var(--border-soft)] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-[color:var(--bg)] text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Basis</th>
                <th className="px-4 py-3 text-center">Seats</th>
                <th className="px-4 py-3 text-right">Commissie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Unlock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-soft)]">
              {commissions.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-[color:var(--text-muted)]"
                  >
                    Nog geen commissies. Deel je link.
                  </td>
                </tr>
              )}
              {commissions.slice(0, 30).map(({ commission }) => {
                const days = daysUntil(commission.unlocksAt);
                return (
                  <tr key={commission.id}>
                    <td className="px-4 py-3 text-xs">
                      {commission.createdAt.toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {commission.isRenewal ? "Verlenging" : "Eerste"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {eur(commission.basisAmountCents)}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {commission.seats}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">
                      {eur(commission.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-xs">{commission.status}</td>
                    <td className="px-4 py-3 text-xs">
                      {commission.status === "pending" && days !== null
                        ? `nog ${days}d`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Aangedragen klanten</h2>
        <ul className="mt-3 divide-y divide-[color:var(--border-soft)] rounded-2xl border border-[color:var(--border-soft)] bg-white">
          {referrals.length === 0 && (
            <li className="p-6 text-center text-sm text-[color:var(--text-muted)]">
              Nog geen referrals. Deel je link op LinkedIn, in nieuwsbrieven of
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
        <Link href="mailto:info@dicteren.ai" className="underline">
          info@dicteren.ai
        </Link>
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

function ConfigCard({
  title,
  enabled,
  type,
  pct,
  fixed,
  duration,
  recurringPct,
}: {
  title: string;
  enabled: boolean;
  type: string | null;
  pct: number;
  fixed: number;
  duration: number;
  recurringPct: number;
}) {
  if (!enabled) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 opacity-60">
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          Niet ingesteld voor dit segment.
        </p>
      </div>
    );
  }
  const value =
    type === "percentage"
      ? `${pct}% per order`
      : `€${(fixed / 100).toFixed(2)} per seat`;
  return (
    <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-5">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mt-2 text-lg font-semibold text-[color:var(--navy)]">
        {value}
      </p>
      <div className="mt-2 grid gap-1 text-xs text-[color:var(--text-muted)]">
        <div>
          Duur:{" "}
          <strong>
            {duration === 0 ? "lifetime" : `${duration} maanden`}
          </strong>
        </div>
        {recurringPct > 0 && (
          <div>
            Verlengings-%: <strong>{recurringPct}%</strong>
          </div>
        )}
      </div>
    </div>
  );
}
