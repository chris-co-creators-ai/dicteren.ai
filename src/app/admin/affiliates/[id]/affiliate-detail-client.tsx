"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, Edit, Pause, Play } from "lucide-react";
import { EditAffiliateModal } from "./edit-affiliate-modal";

type Affiliate = {
  id: string;
  code: string;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  commissionType: string;
  commissionPct: number;
  commissionFixedCents: number;
  payoutMethod: string | null;
  internalNotes: string | null;
  totalEarnedCents: number;
  totalPaidCents: number;
};

type Stats = {
  referralCount: number;
  convertedCount: number;
  pendingCents: number;
  payableCents: number;
  paidCents: number;
};

type Referral = {
  referralId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  organizationId: string | null;
  firstSeenAt: string;
  convertedAt: string | null;
};

type Commission = {
  id: string;
  createdAt: string;
  orderId: string | null;
  licenseCode: string | null;
  basisAmountCents: number;
  seats: number;
  amountCents: number;
  status: string;
  paidAt: string | null;
  paidReference: string | null;
};

type Props = {
  affiliate: Affiliate;
  stats: Stats;
  referrals: Referral[];
  commissions: Commission[];
  formatEur: (cents: number) => string;
};

export function AffiliateDetailClient({
  affiliate,
  stats,
  referrals,
  commissions,
  formatEur,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.dicteren.ai";
  const affiliateLink = `${baseUrl}/zakelijk/start?ref=${affiliate.code}`;

  const visibleCommissions = useMemo(() => {
    if (statusFilter === "all") return commissions;
    return commissions.filter((c) => c.status === statusFilter);
  }, [commissions, statusFilter]);

  const selectedCount = selected.size;
  const selectedSum = useMemo(() => {
    let sum = 0;
    for (const c of commissions) {
      if (selected.has(c.id)) sum += c.amountCents;
    }
    return sum;
  }, [commissions, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    const ids = visibleCommissions
      .filter((c) => c.status === "pending" || c.status === "payable")
      .map((c) => c.id);
    setSelected(new Set(ids));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkSetStatus(
    next: "payable" | "paid" | "voided",
    paidReference?: string,
  ) {
    if (selected.size === 0) return;
    setError(null);
    const ids = Array.from(selected);
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/admin/affiliates/${affiliate.id}/commission/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: next, paidReference }),
        }).then((r) => r.json()),
      ),
    );
    const failed = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success),
    );
    if (failed.length > 0) {
      setError(`${failed.length} van ${ids.length} updates mislukt.`);
    }
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  function bulkPayPrompt() {
    const ref = window.prompt(
      `Factuur- of payout-referentie voor ${selectedCount} commissies (totaal ${formatEur(selectedSum)})?`,
    );
    if (ref === null) return;
    bulkSetStatus("paid", ref || undefined);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(affiliateLink);
    } catch {
      // negeer
    }
  }

  async function toggleStatus() {
    setError(null);
    const next = affiliate.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Status-update mislukt.");
      return;
    }
    startTransition(() => router.refresh());
  }

  function exportCsv() {
    const header = [
      "Datum",
      "Order",
      "License",
      "Basis (€)",
      "Seats",
      "Commissie (€)",
      "Status",
      "Betaald op",
      "Referentie",
    ];
    const rows = commissions.map((c) => [
      new Date(c.createdAt).toLocaleDateString("nl-NL"),
      c.orderId ?? "",
      c.licenseCode ?? "",
      (c.basisAmountCents / 100).toFixed(2),
      c.seats,
      (c.amountCents / 100).toFixed(2),
      c.status,
      c.paidAt ? new Date(c.paidAt).toLocaleDateString("nl-NL") : "",
      c.paidReference ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions-${affiliate.code}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{affiliate.name}</h1>
          <p className="text-sm text-muted-foreground">
            Code: <span className="font-mono">{affiliate.code}</span> ·{" "}
            {affiliate.contactEmail}
            {affiliate.contactPhone && ` · ${affiliate.contactPhone}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={affiliate.status} />
          <button
            onClick={toggleStatus}
            className="btn btn-secondary"
            title={affiliate.status === "active" ? "Pauzeer" : "Activeer"}
          >
            {affiliate.status === "active" ? (
              <>
                <Pause className="size-3.5" strokeWidth={2.2} />
                Pauzeer
              </>
            ) : (
              <>
                <Play className="size-3.5" strokeWidth={2.2} />
                Activeer
              </>
            )}
          </button>
          <button onClick={() => setEditOpen(true)} className="btn btn-secondary">
            <Edit className="size-3.5" strokeWidth={2.2} />
            Bewerk
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        <KPI label="Referrals" value={String(stats.referralCount)} />
        <KPI label="Geconverteerd" value={String(stats.convertedCount)} />
        <KPI label="Pending" value={formatEur(stats.pendingCents)} />
        <KPI label="Payable" value={formatEur(stats.payableCents)} />
        <KPI label="Uitbetaald" value={formatEur(stats.paidCents)} />
      </div>

      <section className="mt-8 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Affiliate-link</h2>
            <p className="text-sm text-muted-foreground">
              Deel deze link. Klanten worden lifetime aan deze affiliate
              gekoppeld.
            </p>
          </div>
          <button onClick={copyLink} className="btn btn-secondary">
            <Copy className="size-3.5" strokeWidth={2.2} />
            Kopieer
          </button>
        </div>
        <div className="mt-3 break-all rounded-md bg-muted/40 p-3 font-mono text-xs">
          {affiliateLink}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Commissie:{" "}
          {affiliate.commissionType === "percentage"
            ? `${affiliate.commissionPct}% per order`
            : `${formatEur(affiliate.commissionFixedCents)} per seat`}
          {affiliate.payoutMethod && ` · payout via ${affiliate.payoutMethod}`}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">Commissies</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border bg-card py-1.5 px-2 text-xs"
          >
            <option value="all">Alle statussen</option>
            <option value="pending">Pending</option>
            <option value="payable">Payable</option>
            <option value="paid">Paid</option>
            <option value="voided">Voided</option>
          </select>
          <button onClick={exportCsv} className="btn btn-secondary ml-auto">
            <Download className="size-3.5" strokeWidth={2.2} />
            Export CSV
          </button>
        </div>

        {selectedCount > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm">
            <span className="font-semibold">
              {selectedCount} geselecteerd · totaal {formatEur(selectedSum)}
            </span>
            <button
              onClick={() => bulkSetStatus("payable")}
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Markeer uitbetaalbaar
            </button>
            <button
              onClick={bulkPayPrompt}
              className="text-xs font-semibold text-green-700 hover:underline"
            >
              Markeer betaald (met referentie)
            </button>
            <button
              onClick={() => bulkSetStatus("voided")}
              className="text-xs font-semibold text-muted-foreground hover:underline"
            >
              Voiden
            </button>
            <button
              onClick={clearSelection}
              className="ml-auto text-xs font-semibold text-muted-foreground hover:underline"
            >
              Selectie wissen
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    onChange={(e) =>
                      e.target.checked ? selectAllVisible() : clearSelection()
                    }
                  />
                </th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Basis</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Commissie</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Referentie</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleCommissions.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Geen commissies in dit filter.
                  </td>
                </tr>
              )}
              {visibleCommissions.map((c) => {
                const canSelect =
                  c.status === "pending" || c.status === "payable";
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                          aria-label={`Select ${c.id}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(c.createdAt).toLocaleDateString("nl-NL")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.orderId?.slice(0, 8) ?? "—"}
                      {c.licenseCode && (
                        <div className="text-[0.6875rem] text-muted-foreground">
                          {c.licenseCode}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatEur(c.basisAmountCents)}
                    </td>
                    <td className="px-4 py-3 text-xs">{c.seats}</td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {formatEur(c.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <StatusBadge value={c.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.paidReference ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">
          Aangedragen klanten ({referrals.length})
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Klant</th>
                <th className="px-4 py-3">Eerste klik</th>
                <th className="px-4 py-3">Eerste order</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {referrals.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
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
                    {new Date(r.firstSeenAt).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.convertedAt
                      ? new Date(r.convertedAt).toLocaleDateString("nl-NL")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.organizationId?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/crm/${r.userId}`}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      CRM →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editOpen && (
        <EditAffiliateModal
          affiliate={affiliate}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
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

function StatusBadge({ value }: { value: string }) {
  const cls =
    value === "active" || value === "paid"
      ? "bg-green-100 text-green-800"
      : value === "paused" || value === "payable"
        ? "bg-yellow-100 text-yellow-800"
        : value === "voided" || value === "disabled"
          ? "bg-gray-200 text-gray-700"
          : "bg-blue-100 text-blue-800";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${cls}`}
    >
      {value}
    </span>
  );
}
