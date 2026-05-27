// Dicteren.ai — Admin overzicht van payout-batches
//
// Een lijst van alle affiliate_payouts: status, bedrag, aantal commissions,
// SEPA-batch-ref. Knop om scheduled → processing → paid te flippen
// (na handmatige SEPA-overboeking).

import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliatePayouts, affiliates } from "@/lib/db/schema";
import { assertAdminOnly } from "@/lib/auth/session";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { PayoutsClient } from "./payouts-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts · Admin" };

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTH_NAMES = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

export default async function PayoutsPage() {
  await assertAdminOnly();

  const rows = await db
    .select({
      id: affiliatePayouts.id,
      affiliateId: affiliatePayouts.affiliateId,
      affiliateName: affiliates.name,
      affiliateContactEmail: affiliates.contactEmail,
      periodYear: affiliatePayouts.periodYear,
      periodMonth: affiliatePayouts.periodMonth,
      totalCents: affiliatePayouts.totalCents,
      commissionCount: affiliatePayouts.commissionCount,
      status: affiliatePayouts.status,
      sepaBatchRef: affiliatePayouts.sepaBatchRef,
      scheduledAt: affiliatePayouts.scheduledAt,
      sentAt: affiliatePayouts.sentAt,
      paidAt: affiliatePayouts.paidAt,
    })
    .from(affiliatePayouts)
    .leftJoin(affiliates, eq(affiliates.id, affiliatePayouts.affiliateId))
    .orderBy(desc(affiliatePayouts.scheduledAt));

  const totals = {
    scheduled: rows
      .filter((r) => r.status === "scheduled")
      .reduce((s, r) => s + r.totalCents, 0),
    paid: rows
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + r.totalCents, 0),
    count: rows.length,
  };

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">Affiliate-payouts</h1>
            <p className="text-sm text-muted-foreground">
              Maandelijkse uitbetaling-batches. Cron draait elke 25e.
            </p>
          </div>
          <Link
            href="/admin/affiliates"
            className="text-sm font-semibold text-muted-foreground hover:underline"
          >
            ← Naar affiliates
          </Link>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <KPI label="Wachtend op uitbetaling" value={eur(totals.scheduled)} />
          <KPI label="Uitbetaald lifetime" value={eur(totals.paid)} />
          <KPI label="Batches totaal" value={String(totals.count)} />
        </div>

        <PayoutsClient
          payouts={rows.map((r) => ({
            id: r.id,
            affiliateId: r.affiliateId,
            affiliateName: r.affiliateName ?? "—",
            affiliateContactEmail: r.affiliateContactEmail ?? "",
            period: `${MONTH_NAMES[r.periodMonth - 1]} ${r.periodYear}`,
            totalCents: r.totalCents,
            commissionCount: r.commissionCount,
            status: r.status,
            sepaBatchRef: r.sepaBatchRef,
            scheduledAt: r.scheduledAt.toISOString(),
            paidAt: r.paidAt?.toISOString() ?? null,
          }))}
        />
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
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
