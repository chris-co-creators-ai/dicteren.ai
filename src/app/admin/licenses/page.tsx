"use client";

import { useMemo, useState } from "react";
import {
  Apple,
  Calendar,
  Copy,
  Filter,
  Key,
  Layers,
  Monitor,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import {
  MOCK_LICENSES,
  type License,
  type LicenseStatus,
} from "@/lib/mock/admin";
import { cn } from "@/lib/utils";

type TabKey = "all" | LicenseStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "active", label: "Actief" },
  { key: "unused", label: "Ongebruikt" },
  { key: "expired", label: "Verlopen" },
  { key: "revoked", label: "Ingetrokken" },
];

const LICENSE_KPIS = [
  { label: "Totaal codes", value: "418", detail: "+12 vandaag" },
  { label: "Actieve licenties", value: "142", detail: "34% benutting" },
  { label: "Verlopen deze maand", value: "6", detail: "Herinnering verstuurd" },
  { label: "Activaties /24u", value: "23", detail: "Gemiddeld 18" },
];

const STATUS_META: Record<
  LicenseStatus,
  { label: string; chip: string; dot: string }
> = {
  active: { label: "Actief", chip: "chip-green", dot: "var(--green)" },
  unused: { label: "Ongebruikt", chip: "chip-navy", dot: "var(--navy-300)" },
  expired: { label: "Verlopen", chip: "chip-orange", dot: "var(--orange)" },
  revoked: { label: "Ingetrokken", chip: "chip-red", dot: "var(--red)" },
};

const TYPE_META: Record<License["type"], { label: string; color: string }> = {
  beta: { label: "Beta", color: "var(--navy-500)" },
  pro: { label: "Persoonlijk", color: "var(--orange-600)" },
  team: { label: "Zakelijk", color: "var(--navy)" },
};

function StatusPill({ status }: { status: LicenseStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`chip ${m.chip} gap-1.5 px-2 py-0.5 text-[0.625rem]`}>
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ background: m.dot }}
      />
      {m.label}
    </span>
  );
}

export default function AdminLicensesPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<License | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: MOCK_LICENSES.length,
      active: 0,
      unused: 0,
      expired: 0,
      revoked: 0,
    };
    for (const l of MOCK_LICENSES) c[l.status]++;
    return c;
  }, []);

  const filtered = useMemo(() => {
    return MOCK_LICENSES.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.code.toLowerCase().includes(q) ||
          (r.email?.toLowerCase().includes(q) ?? false) ||
          (r.organization?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [tab, search]);

  function toggle(code: string) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.code)));
  }
  function openModal(bulk: boolean) {
    setBulkMode(bulk);
    setModalOpen(true);
  }

  return (
    <>
      <AdminTopbar
        actions={
          <>
            <button className="btn btn-secondary btn-sm">
              <Upload className="size-3" strokeWidth={2.2} />
              Exporteer CSV
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openModal(false)}
            >
              <Plus className="size-3" strokeWidth={2.4} />
              Nieuwe code
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
              Licenties
            </h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Genereer, beheer en herroep beta- en betaalde licenties.
            </p>
          </div>
          <div className="ml-auto">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openModal(true)}
            >
              <Layers className="size-3" strokeWidth={2.2} />
              Bulk genereren
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LICENSE_KPIS.map((kpi) => (
            <div key={kpi.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {kpi.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">
                {kpi.value}
              </div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {kpi.detail}
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="brand-card overflow-hidden p-0">
          {/* Filter bar */}
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
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
                  strokeWidth={2.2}
                  style={{ color: "var(--text-soft)" }}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek code, e-mail of org…"
                  className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
                  style={{ background: "var(--bg)" }}
                />
              </div>
              <button className="btn btn-secondary btn-sm hidden sm:inline-flex">
                <Filter className="size-3" strokeWidth={2.2} />
                Filter
              </button>
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div
              className="flex flex-wrap items-center gap-2.5 border-b border-[color:var(--border-soft)] p-3"
              style={{ background: "var(--orange-50)" }}
            >
              <span className="text-sm font-semibold text-[color:var(--orange-600)]">
                {selected.size} geselecteerd
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button className="btn btn-secondary btn-sm">
                  <Calendar className="size-3" strokeWidth={2.2} />
                  Verleng vervaldatum
                </button>
                <button className="btn btn-secondary btn-sm">
                  <Upload className="size-3" strokeWidth={2.2} />
                  Exporteer selectie
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: "#fdecec", color: "#b8323a" }}
                >
                  <Trash2 className="size-3" strokeWidth={2.2} />
                  Intrekken
                </button>
              </div>
            </div>
          )}

          {/* Table — horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr
                  className="text-[color:var(--text-muted)]"
                  style={{ background: "var(--bg)" }}
                >
                  <th className="w-9 px-4 py-2.5 text-left">
                    <input
                      type="checkbox"
                      aria-label="Selecteer alles"
                      checked={
                        filtered.length > 0 &&
                        selected.size === filtered.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                  {[
                    "Code",
                    "Type",
                    "Status",
                    "Toegewezen aan",
                    "Activaties",
                    "Vervalt",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-14 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-t",
                      selected.has(r.code)
                        ? "bg-[color:var(--orange-50)]"
                        : "bg-white",
                    )}
                    style={{
                      borderTop: "1px solid var(--border-soft)",
                    }}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.code)}
                        onChange={() => toggle(r.code)}
                        aria-label={`Selecteer ${r.code}`}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-[color:var(--navy)]">
                          {r.code}
                        </code>
                        <button
                          title="Kopieer"
                          aria-label="Kopieer code"
                          className="rounded p-1 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)]"
                        >
                          <Copy className="size-3" strokeWidth={2.2} />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: TYPE_META[r.type].color }}
                      >
                        {TYPE_META[r.type].label}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-sm text-[color:var(--text)]">
                        {r.email ?? "Niet toegewezen"}
                      </div>
                      {r.organization && (
                        <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                          {r.organization}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                      {r.activations} / {r.maxActivations}
                    </td>
                    <td className="px-2 py-3 text-xs text-[color:var(--text-muted)]">
                      {r.expiresAt}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDrawer(r)}
                        aria-label="Opties"
                        className="rounded p-1.5 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)]"
                      >
                        <MoreHorizontal className="size-4" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
            <span>
              1–{filtered.length} van {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {modalOpen && (
        <GenerateModal
          bulk={bulkMode}
          onClose={() => setModalOpen(false)}
        />
      )}
      {drawer && (
        <DetailDrawer license={drawer} onClose={() => setDrawer(null)} />
      )}
    </>
  );
}

function GenerateModal({
  bulk,
  onClose,
}: {
  bulk: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<License["type"]>("beta");
  const [quantity, setQuantity] = useState(10);
  const [validity, setValidity] = useState(90);
  const [maxAct, setMaxAct] = useState(2);
  const [assign, setAssign] = useState("");
  const [sendMail, setSendMail] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white"
        style={{ boxShadow: "var(--shadow-pop)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-[color:var(--border-soft)] px-6 py-4">
          <Key
            className="size-4.5"
            strokeWidth={2}
            style={{ color: "var(--orange)" }}
          />
          <h3 className="text-base font-bold sm:text-[17px]">
            {bulk ? "Bulk-codes genereren" : "Licentiecode genereren"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Sluit modal"
            className="ml-auto rounded p-1.5 hover:bg-[color:var(--bg-deep)]"
          >
            <X
              className="size-4"
              strokeWidth={2.2}
              style={{ color: "var(--text-muted)" }}
            />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">
              Licentietype
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["beta", "pro", "team"] as const).map((t) => {
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                      active
                        ? "border-[color:var(--orange)] bg-[color:var(--orange-50)] text-[color:var(--orange-600)]"
                        : "border-[color:var(--border-soft)] text-[color:var(--navy)] hover:border-[color:var(--navy-300)]",
                    )}
                  >
                    {TYPE_META[t].label}
                  </button>
                );
              })}
            </div>
          </div>

          {bulk && (
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">
                Aantal codes
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--orange)]"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">
                Geldigheid (dagen)
              </label>
              <input
                type="number"
                value={validity}
                onChange={(e) => setValidity(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--orange)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">
                Max activaties
              </label>
              <input
                type="number"
                value={maxAct}
                onChange={(e) => setMaxAct(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--orange)]"
              />
            </div>
          </div>

          {!bulk && (
            <div>
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">
                Toewijzen aan (optioneel)
              </label>
              <input
                value={assign}
                onChange={(e) => setAssign(e.target.value)}
                placeholder="e-mail of organisatie"
                className="mt-1.5 w-full rounded-xl border border-[color:var(--border-soft)] px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--orange)]"
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <input
              type="checkbox"
              checked={sendMail}
              onChange={(e) => setSendMail(e.target.checked)}
            />
            Verstuur welkomstmail met activatielink
          </label>
        </div>

        <div
          className="flex justify-end gap-2 border-t border-[color:var(--border-soft)] px-6 py-4"
          style={{ background: "var(--bg)" }}
        >
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn btn-primary btn-sm">
            {bulk ? `Genereer ${quantity} codes` : "Genereer code"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({
  license,
  onClose,
}: {
  license: License;
  onClose: () => void;
}) {
  const fields: { label: string; value: string }[] = [
    { label: "Toegewezen", value: license.email ?? "Niet toegewezen" },
    { label: "Organisatie", value: license.organization ?? "Geen" },
    {
      label: "Activaties",
      value: `${license.activations} / ${license.maxActivations}`,
    },
    { label: "Vervalt", value: license.expiresAt },
    { label: "Aangemaakt", value: license.issuedAt },
  ];

  const devices = [
    { os: "macOS 14.5", name: "MacBook Pro M2", since: "14 mei 2026", icon: Apple },
    { os: "Windows 11", name: "Kantoor-PC", since: "15 mei 2026", icon: Monitor },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[color:var(--border-soft)] bg-white"
        style={{ boxShadow: "-0.75rem 0 2rem rgba(4, 38, 96, 0.10)" }}
      >
        <div className="flex items-center border-b border-[color:var(--border-soft)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
              {TYPE_META[license.type].label}
            </div>
            <code className="font-mono text-sm text-[color:var(--navy)]">
              {license.code}
            </code>
          </div>
          <button
            onClick={onClose}
            aria-label="Sluit drawer"
            className="ml-auto rounded p-1.5 hover:bg-[color:var(--bg-deep)]"
          >
            <X
              className="size-4"
              strokeWidth={2.2}
              style={{ color: "var(--text-muted)" }}
            />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <StatusPill status={license.status} />

          <div className="mt-5 grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div
                key={f.label}
                className="rounded-xl p-3"
                style={{ background: "var(--bg)" }}
              >
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-soft)]">
                  {f.label}
                </div>
                <div className="mt-1 text-sm">{f.value}</div>
              </div>
            ))}
          </div>

          <h4 className="mt-6 text-sm font-bold text-[color:var(--navy)]">
            Apparaten
          </h4>
          <div className="mt-2.5 flex flex-col gap-2">
            {devices.map((d) => {
              const Icon = d.icon;
              return (
                <div
                  key={d.name}
                  className="flex items-center gap-2.5 rounded-xl border border-[color:var(--border-soft)] p-3"
                >
                  <Icon
                    className="size-4 shrink-0"
                    strokeWidth={1.8}
                    style={{ color: "var(--navy)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {d.name}
                    </div>
                    <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                      {d.os} · sinds {d.since}
                    </div>
                  </div>
                  <button
                    className="shrink-0 px-1 text-[0.6875rem]"
                    style={{ color: "var(--red)" }}
                  >
                    Reset
                  </button>
                </div>
              );
            })}
          </div>

          <h4 className="mt-6 text-sm font-bold text-[color:var(--navy)]">
            Tijdlijn
          </h4>
          <div className="mt-2.5 flex flex-col gap-1.5 font-mono text-[0.6875rem] text-[color:var(--text-muted)]">
            <div>21 mei · code geactiveerd vanaf macOS</div>
            <div>15 mei · 2e apparaat toegevoegd</div>
            <div>14 mei · code aangemaakt door Christian</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-[color:var(--border-soft)] p-4">
          <button className="btn btn-secondary btn-sm">
            <Calendar className="size-3" strokeWidth={2.2} />
            Verleng
          </button>
          <button className="btn btn-secondary btn-sm">
            <RefreshCw className="size-3" strokeWidth={2.2} />
            Reset
          </button>
          <button className="btn btn-secondary btn-sm">
            <Copy className="size-3" strokeWidth={2.2} />
            Kopieer
          </button>
          <button
            className="btn btn-sm"
            style={{ background: "#fdecec", color: "#b8323a" }}
          >
            <Trash2 className="size-3" strokeWidth={2.2} />
            Intrekken
          </button>
        </div>
      </aside>
    </>
  );
}
