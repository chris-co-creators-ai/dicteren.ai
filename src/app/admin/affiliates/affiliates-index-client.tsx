"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, Search } from "lucide-react";
import { CreatePartnerModal } from "./create-partner-modal";

type AffiliateRow = {
  id: string;
  code: string;
  name: string;
  contactEmail: string;
  status: string;
  commissionType: string;
  commissionPct: number;
  commissionFixedCents: number;
  businessCommissionType: string | null;
  businessCommissionPct: number;
  businessCommissionFixedCents: number;
  consumerCommissionType: string | null;
  consumerCommissionPct: number;
  consumerCommissionFixedCents: number;
  totalEarnedCents: number;
  totalPaidCents: number;
  createdAt: string;
};

/** Commissie-samenvatting: toon de V2 per-type-regels (zakelijk/consument) als
 *  die gezet zijn, anders de legacy-regel. Voorkomt "0% per order" voor V2-affiliates. */
function commissionLabel(a: {
  commissionType: string;
  commissionPct: number;
  commissionFixedCents: number;
  businessCommissionType: string | null;
  businessCommissionPct: number;
  businessCommissionFixedCents: number;
  consumerCommissionType: string | null;
  consumerCommissionPct: number;
  consumerCommissionFixedCents: number;
}): string {
  const rule = (
    type: string | null,
    pct: number,
    fixed: number,
  ): string | null => {
    if (type === "percentage" && pct > 0) return `${pct}%`;
    if (type === "fixed_per_seat" && fixed > 0)
      return `€${(fixed / 100).toFixed(0)}/seat`;
    return null;
  };
  const biz = rule(a.businessCommissionType, a.businessCommissionPct, a.businessCommissionFixedCents);
  const con = rule(a.consumerCommissionType, a.consumerCommissionPct, a.consumerCommissionFixedCents);
  const parts: string[] = [];
  if (biz) parts.push(`Zakelijk ${biz}`);
  if (con) parts.push(`Consument ${con}`);
  if (parts.length) return parts.join(" · ");
  // Fallback: legacy
  return a.commissionType === "percentage"
    ? `${a.commissionPct}% per order`
    : `€${(a.commissionFixedCents / 100).toFixed(0)}/seat`;
}

function eur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AffiliatesIndexClient({
  affiliates,
}: {
  affiliates: AffiliateRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return affiliates.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.contactEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [affiliates, statusFilter, search]);

  function exportCsv() {
    const header = [
      "Naam",
      "Code",
      "Email",
      "Status",
      "Commissie",
      "Verdiend (€)",
      "Uitbetaald (€)",
      "Openstaand (€)",
      "Aangemaakt",
    ];
    const rows = filtered.map((a) => [
      a.name,
      a.code,
      a.contactEmail,
      a.status,
      commissionLabel(a),
      (a.totalEarnedCents / 100).toFixed(2),
      (a.totalPaidCents / 100).toFixed(2),
      ((a.totalEarnedCents - a.totalPaidCents) / 100).toFixed(2),
      new Date(a.createdAt).toLocaleDateString("nl-NL"),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `affiliates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2.2}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek naam, code of email…"
            className="w-full rounded-lg border bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-orange-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-card py-2 px-3 text-sm outline-none"
        >
          <option value="all">Alle statussen</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="disabled">Disabled</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="btn btn-secondary"
            disabled={filtered.length === 0}
          >
            <Download className="size-3.5" strokeWidth={2.2} />
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus className="size-3.5" strokeWidth={2.2} />
            Partner toevoegen
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Naam</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Commissie</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Verdiend</th>
              <th className="px-4 py-3 text-right">Openstaand</th>
              <th className="px-4 py-3 text-right">Uitbetaald</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {affiliates.length === 0
                    ? "Nog geen affiliates. Klik op + Partner toevoegen."
                    : "Geen affiliates in dit filter."}
                </td>
              </tr>
            )}
            {filtered.map((a) => {
              const open = a.totalEarnedCents - a.totalPaidCents;
              return (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.contactEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                  <td className="px-4 py-3 text-xs">{commissionLabel(a)}</td>
                  <td className="px-4 py-3 text-xs">
                    <StatusBadge value={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {eur(a.totalEarnedCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {open > 0 ? (
                      <span className="font-semibold text-orange-700">
                        {eur(open)}
                      </span>
                    ) : (
                      eur(0)
                    )}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreatePartnerModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}

function StatusBadge({ value }: { value: string }) {
  const cls =
    value === "active"
      ? "bg-green-100 text-green-800"
      : value === "paused"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${cls}`}
    >
      {value}
    </span>
  );
}
