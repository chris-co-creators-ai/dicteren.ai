"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Search } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";
type TabKey = "all" | OrderStatus;

type OrderRow = {
  id: string;
  reference: string;
  molliePaymentId: string | null;
  customer: string;
  email: string;
  plan: string;
  amount: string;
  status: string;
  createdAt: string;
};

type Kpi = { label: string; value: string; detail: string };

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "paid", label: "Betaald" },
  { key: "pending", label: "In behandeling" },
  { key: "failed", label: "Mislukt" },
  { key: "refunded", label: "Terugbetaald" },
  { key: "canceled", label: "Geannuleerd" },
];

const STATUS_META: Record<OrderStatus, { label: string; chip: string; dot: string }> = {
  pending: { label: "In behandeling", chip: "chip-orange", dot: "var(--orange)" },
  paid: { label: "Betaald", chip: "chip-green", dot: "var(--green)" },
  failed: { label: "Mislukt", chip: "chip-red", dot: "var(--red)" },
  refunded: { label: "Terugbetaald", chip: "chip-navy", dot: "var(--navy-300)" },
  canceled: { label: "Geannuleerd", chip: "chip-navy", dot: "var(--navy-300)" },
};

function statusKey(s: string): OrderStatus {
  return (["pending", "paid", "failed", "refunded", "canceled"] as const).includes(
    s as OrderStatus,
  )
    ? (s as OrderStatus)
    : "pending";
}

export function OrdersTable({ orders, kpis }: { orders: OrderRow[]; kpis: Kpi[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: orders.length,
      pending: 0,
      paid: 0,
      failed: 0,
      refunded: 0,
      canceled: 0,
    };
    for (const o of orders) c[statusKey(o.status)]++;
    return c;
  }, [orders]);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (tab !== "all" && statusKey(o.status) !== tab) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            o.reference.toLowerCase().includes(q) ||
            o.customer.toLowerCase().includes(q) ||
            o.email.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [tab, search, orders],
  );

  return (
    <>
      <AdminTopbar
        actions={
          <button className="btn btn-secondary btn-sm">
            <Download className="size-3" strokeWidth={2.2} />
            Exporteer CSV
          </button>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Orders
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live data uit Neon · webhook-status komt rechtstreeks uit Mollie.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {kpi.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{kpi.value}</div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {kpi.detail}
              </div>
            </div>
          ))}
        </div>

        <div className="brand-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    tab === t.key
                      ? "bg-[color:var(--bg-deep)] font-bold text-[color:var(--navy)]"
                      : "font-medium text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[0.625rem]",
                      tab === t.key
                        ? "bg-white text-[color:var(--text-muted)]"
                        : "bg-[color:var(--bg-deep)] text-[color:var(--text-muted)]",
                    )}
                  >
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
                strokeWidth={2.2}
                style={{ color: "var(--text-soft)" }}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek order, klant of e-mail…"
                className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
                style={{ background: "var(--bg)" }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr
                  className="text-[color:var(--text-muted)]"
                  style={{ background: "var(--bg)" }}
                >
                  {["Order", "Klant", "Plan", "Bedrag", "Status", "Datum"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-14 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      Nog geen orders.
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => {
                    const m = STATUS_META[statusKey(o.status)];
                    return (
                      <tr
                        key={o.id}
                        className="bg-white"
                        style={{ borderTop: "1px solid var(--border-soft)" }}
                      >
                        <td className="px-3 py-3">
                          <code className="font-mono text-xs text-[color:var(--navy)]">
                            {o.reference}
                          </code>
                          {o.molliePaymentId && (
                            <div className="font-mono text-[0.625rem] text-[color:var(--text-soft)]">
                              {o.molliePaymentId}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm font-semibold">{o.customer}</div>
                          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                            {o.email}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {o.plan}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs font-semibold">
                          {o.amount}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`chip ${m.chip} gap-1.5 px-2 py-0.5 text-[0.625rem]`}>
                            <span
                              aria-hidden
                              className="inline-block size-1.5 rounded-full"
                              style={{ background: m.dot }}
                            />
                            {m.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {new Date(o.createdAt).toLocaleString("nl-NL", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {o.molliePaymentId ? (
                            <a
                              href={`https://my.mollie.com/dashboard/payments/${o.molliePaymentId}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label="Bekijk in Mollie"
                              className="inline-flex rounded p-1.5 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)]"
                            >
                              <ExternalLink className="size-3.5" strokeWidth={2} />
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
            <span>
              1–{filtered.length} van {filtered.length}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
