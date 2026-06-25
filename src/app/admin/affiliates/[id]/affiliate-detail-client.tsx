"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  Pause,
  Play,
  Plus,
  Users,
  UserCheck,
  Clock,
  Coins,
  BadgeCheck,
  Link2,
  ArrowUpRight,
} from "lucide-react";
import { affiliatePublicUrl } from "@/lib/url";
import { AffiliateEditForm } from "./edit-affiliate-modal";
import { CreateDiscountCodeModal } from "./create-discount-code-modal";

type Affiliate = {
  id: string;
  code: string;
  slug: string | null;
  name: string;
  displayName: string | null;
  welcomeMessage: string | null;
  brandColor: string | null;
  brandLogoUrl: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  commissionType: string;
  commissionPct: number;
  commissionFixedCents: number;
  consumerCommissionType: string | null;
  consumerCommissionPct: number;
  consumerCommissionFixedCents: number;
  consumerCommissionDurationMonths: number;
  consumerRecurringCommissionPct: number;
  businessCommissionType: string | null;
  businessCommissionPct: number;
  businessCommissionFixedCents: number;
  businessCommissionDurationMonths: number;
  businessRecurringCommissionPct: number;
  minimumPayoutCents: number;
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

type DiscountCode = {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_months";
  value: number;
  appliesTo: "consumer" | "organization" | null;
  redemptionCount: number;
  maxRedemptions: number | null;
  isActive: boolean;
  validUntil: string | null;
  createdAt: string;
};

type Props = {
  affiliate: Affiliate;
  stats: Stats;
  referrals: Referral[];
  commissions: Commission[];
  discountCodes: DiscountCode[];
};

function formatEur(cents: number): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function commissionParts(a: Affiliate): string[] {
  const rule = (type: string | null, pct: number, fixed: number) => {
    if (type === "percentage" && pct > 0) return `${pct}%`;
    if (type === "fixed_per_seat" && fixed > 0)
      return `€${(fixed / 100).toFixed(0)}/seat`;
    return null;
  };
  const biz = rule(
    a.businessCommissionType,
    a.businessCommissionPct,
    a.businessCommissionFixedCents,
  );
  const con = rule(
    a.consumerCommissionType,
    a.consumerCommissionPct,
    a.consumerCommissionFixedCents,
  );
  const parts: string[] = [];
  if (biz) parts.push(`Zakelijk ${biz}`);
  if (con) parts.push(`Consument ${con}`);
  if (parts.length) return parts;
  return [
    a.commissionType === "percentage"
      ? `${a.commissionPct}% per order`
      : `${formatEur(a.commissionFixedCents)} per seat`,
  ];
}

export function AffiliateDetailClient({
  affiliate,
  stats,
  referrals,
  commissions,
  discountCodes,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const accent = affiliate.brandColor ?? "var(--navy)";
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.dicteren.ai";
  const affiliateLink = affiliatePublicUrl(affiliate, baseUrl);
  const displayName = affiliate.displayName ?? affiliate.name;

  const visibleCommissions = useMemo(() => {
    if (statusFilter === "all") return commissions;
    return commissions.filter((c) => c.status === statusFilter);
  }, [commissions, statusFilter]);

  const selectedCount = selected.size;
  const selectedSum = useMemo(() => {
    let sum = 0;
    for (const c of commissions) if (selected.has(c.id)) sum += c.amountCents;
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
    setSelected(
      new Set(
        visibleCommissions
          .filter((c) => c.status === "pending" || c.status === "payable")
          .map((c) => c.id),
      ),
    );
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
      (r) =>
        r.status === "rejected" || (r.status === "fulfilled" && !r.value.success),
    );
    if (failed.length > 0)
      setError(`${failed.length} van ${ids.length} updates mislukt.`);
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
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* negeer */
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
    <div className="space-y-6">
      {/* ─── Hero-header met de merkkleur van de partner als accent ─── */}
      <header
        className="overflow-hidden rounded-2xl border bg-card"
        style={{ borderTopColor: accent, borderTopWidth: 3 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span
              className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-lg font-bold text-white"
              style={{ background: accent }}
            >
              {affiliate.brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={affiliate.brandLogoUrl}
                  alt={displayName}
                  className="size-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                {affiliate.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {affiliate.code}
                </span>
                <span>{affiliate.contactEmail}</span>
                {affiliate.contactPhone && <span>· {affiliate.contactPhone}</span>}
              </div>
            </div>
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
          </div>
        </div>

        {/* Deelbare link + commissie-samenvatting */}
        <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-5 py-3 sm:px-6">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <code className="min-w-0 flex-1 truncate text-xs text-foreground">
            {affiliateLink}
          </code>
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold hover:bg-background"
          >
            <Copy className="size-3.5" strokeWidth={2.2} />
            {copied ? "Gekopieerd" : "Kopieer"}
          </button>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex flex-wrap items-center gap-1.5">
            {commissionParts(affiliate).map((p) => (
              <span
                key={p}
                className="rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground"
              >
                {p}
              </span>
            ))}
            {affiliate.payoutMethod && (
              <span className="text-[0.6875rem] text-muted-foreground">
                payout via {affiliate.payoutMethod}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ─── KPI-strip ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KPI icon={Users} label="Referrals" value={String(stats.referralCount)} />
        <KPI
          icon={UserCheck}
          label="Geconverteerd"
          value={String(stats.convertedCount)}
        />
        <KPI icon={Clock} label="Pending" value={formatEur(stats.pendingCents)} />
        <KPI
          icon={Coins}
          label="Payable"
          value={formatEur(stats.payableCents)}
          accent="var(--orange)"
        />
        <KPI
          icon={BadgeCheck}
          label="Uitbetaald"
          value={formatEur(stats.paidCents)}
          accent="#1F8A4C"
        />
      </div>

      {/* ─── Commissies ─── */}
      <Section
        title="Commissies"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border bg-card px-2 py-1.5 text-xs"
            >
              <option value="all">Alle statussen</option>
              <option value="pending">Pending</option>
              <option value="payable">Payable</option>
              <option value="paid">Paid</option>
              <option value="voided">Voided</option>
            </select>
            <button onClick={exportCsv} className="btn btn-secondary">
              <Download className="size-3.5" strokeWidth={2.2} />
              CSV
            </button>
          </div>
        }
      >
        {selectedCount > 0 && (
          <div
            className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"
            style={{
              borderColor: "var(--orange)",
              background: "var(--orange-50)",
            }}
          >
            <span className="font-semibold text-[color:var(--navy)]">
              {selectedCount} geselecteerd · {formatEur(selectedSum)}
            </span>
            <button
              onClick={() => bulkSetStatus("payable")}
              className="text-xs font-semibold text-[color:var(--navy)] hover:underline"
            >
              Markeer uitbetaalbaar
            </button>
            <button
              onClick={bulkPayPrompt}
              className="text-xs font-semibold hover:underline"
              style={{ color: "#1F8A4C" }}
            >
              Markeer betaald
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
              Wissen
            </button>
          </div>
        )}
        {error && (
          <div
            className="mb-3 rounded-md border p-3 text-sm"
            style={{ borderColor: "var(--red)", background: "var(--red-50)", color: "var(--red)" }}
          >
            {error}
          </div>
        )}
        <Table
          head={
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
          }
          empty={visibleCommissions.length === 0 ? "Geen commissies in dit filter." : null}
          colSpan={8}
        >
          {visibleCommissions.map((c) => {
            const canSelect = c.status === "pending" || c.status === "payable";
            return (
              <tr key={c.id} className="hover:bg-muted/40">
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
                <td className="px-4 py-3 text-xs">{formatEur(c.basisAmountCents)}</td>
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
        </Table>
      </Section>

      {/* ─── Discount-codes ─── */}
      <Section
        title="Discount-codes"
        subtitle="Bij gebruik krijgt de klant korting én wordt deze affiliate als owner geattribueerd."
        actions={
          <button
            onClick={() => setDiscountModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="size-3.5" strokeWidth={2.2} />
            Nieuwe code
          </button>
        }
      >
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Korting</th>
              <th className="px-4 py-3">Doelgroep</th>
              <th className="px-4 py-3">Gebruik</th>
              <th className="px-4 py-3">Geldig tot</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          }
          empty={discountCodes.length === 0 ? "Nog geen discount-codes." : null}
          colSpan={7}
        >
          {discountCodes.map((d) => (
            <DiscountRow
              key={d.id}
              d={d}
              formatEur={formatEur}
              onChange={() => startTransition(() => router.refresh())}
            />
          ))}
        </Table>
      </Section>

      {/* ─── Aangedragen klanten ─── */}
      <Section title={`Aangedragen klanten (${referrals.length})`}>
        <Table
          head={
            <tr>
              <th className="px-4 py-3">Klant</th>
              <th className="px-4 py-3">Eerste klik</th>
              <th className="px-4 py-3">Eerste order</th>
              <th className="px-4 py-3">Org</th>
              <th className="px-4 py-3"></th>
            </tr>
          }
          empty={referrals.length === 0 ? "Nog geen referrals." : null}
          colSpan={5}
        >
          {referrals.map((r) => (
            <tr key={r.referralId} className="hover:bg-muted/40">
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
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--navy)] hover:underline"
                >
                  CRM <ArrowUpRight className="size-3" strokeWidth={2.5} />
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* ─── Instellingen (inline) ─── */}
      <AffiliateEditForm
        affiliate={affiliate}
        onSaved={() => startTransition(() => router.refresh())}
      />

      {discountModalOpen && (
        <CreateDiscountCodeModal
          affiliateId={affiliate.id}
          affiliateName={affiliate.name}
          onClose={() => setDiscountModalOpen(false)}
          onCreated={() => {
            setDiscountModalOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

// ─── Bouwstenen ───

function Section({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>
      <div className="px-5 pb-5 sm:px-6">{children}</div>
    </section>
  );
}

function Table({
  head,
  children,
  empty,
  colSpan,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
  empty: string | null;
  colSpan: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-[0.625rem] uppercase tracking-wide text-muted-foreground">
          {head}
        </thead>
        <tbody className="divide-y">
          {empty ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-10 text-center text-sm text-muted-foreground"
              >
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
        <Icon
          className="size-3.5 text-muted-foreground"
          strokeWidth={2}
          style={accent ? { color: accent } : undefined}
        />
      </div>
      <div
        className="mt-2 text-xl font-bold"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function DiscountRow({
  d,
  formatEur,
  onChange,
}: {
  d: DiscountCode;
  formatEur: (cents: number) => string;
  onChange: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function toggleActive() {
    setPending(true);
    await fetch(`/api/admin/discount-codes/${d.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    setPending(false);
    onChange();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(d.code);
    } catch {
      /* ignore */
    }
  }

  const kortingLabel =
    d.type === "percentage"
      ? `-${d.value}%`
      : d.type === "fixed"
        ? `-${formatEur(d.value)}`
        : `${d.value} mnd gratis`;

  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-3">
        <button
          onClick={copyCode}
          className="font-mono text-xs font-semibold hover:underline"
          title="Klik om te kopiëren"
        >
          {d.code}
        </button>
      </td>
      <td className="px-4 py-3 text-xs">{kortingLabel}</td>
      <td className="px-4 py-3 text-xs">
        {d.appliesTo === "organization"
          ? "Zakelijk"
          : d.appliesTo === "consumer"
            ? "Consumer"
            : "Alle"}
      </td>
      <td className="px-4 py-3 text-xs">
        {d.redemptionCount}
        {d.maxRedemptions ? ` / ${d.maxRedemptions}` : " · ∞"}
      </td>
      <td className="px-4 py-3 text-xs">
        {d.validUntil ? new Date(d.validUntil).toLocaleDateString("nl-NL") : "—"}
      </td>
      <td className="px-4 py-3 text-xs">
        <StatusBadge value={d.isActive ? "active" : "disabled"} />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={toggleActive}
          disabled={pending}
          className="text-xs font-semibold text-[color:var(--navy)] hover:underline"
        >
          {d.isActive ? "Deactiveer" : "Activeer"}
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ value }: { value: string }) {
  const color =
    value === "active" || value === "paid"
      ? "#1F8A4C"
      : value === "paused" || value === "payable" || value === "pending"
        ? "var(--orange)"
        : value === "voided" || value === "disabled"
          ? "var(--text-muted)"
          : "var(--navy)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2 py-0.5 text-[0.625rem] font-semibold capitalize">
      <span
        className="inline-block size-1.5 rounded-full"
        style={{ background: color }}
      />
      <span style={{ color }}>{value}</span>
    </span>
  );
}
