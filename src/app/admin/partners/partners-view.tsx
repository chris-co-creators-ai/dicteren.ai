"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Filter, ExternalLink } from "lucide-react";

type Org = {
  id: string;
  externalId: string;
  organizationName: string;
  priority: string | null;
  segment: string | null;
  outreachStatus: string | null;
  pilotStatus: string | null;
  email: string | null;
  city: string | null;
  accountOwner: string | null;
  followUpDate: string | null;
  freeCodesCount: number | null;
  partnerCode: string | null;
  licenseStatus: string | null;
  activeActivations: number;
};

type Kpis = {
  total: number;
  perStatus: Record<string, number>;
  activeCodes: number;
  totalActivations: number;
  activeActivations: number;
  last7DaysActivations: number;
  last30DaysActivations: number;
};

const PRIORITY_LABEL: Record<string, string> = {
  A: "A · hoog",
  B: "B · medium",
  C: "C · laag",
};

const STATUS_OPTIONS = [
  "Alle",
  "Nieuw",
  "Benaderd",
  "In gesprek",
  "Akkoord",
  "Live",
  "Afgewezen",
];

export function PartnersView({ orgs, kpis }: { orgs: Org[]; kpis: Kpis }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [priorityFilter, setPriorityFilter] = useState("Alle");

  const filtered = useMemo(() => {
    return orgs.filter((o) => {
      if (statusFilter !== "Alle" && o.outreachStatus !== statusFilter) return false;
      if (priorityFilter !== "Alle" && o.priority !== priorityFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = [
          o.organizationName,
          o.segment ?? "",
          o.city ?? "",
          o.email ?? "",
          o.partnerCode ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orgs, query, statusFilter, priorityFilter]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maatschappelijke partners</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Outreach-pipeline voor stichtingen en non-profits. Per partner één gedeelde gratis code.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Kpi label="Organisaties" value={kpis.total} sublabel={`${kpis.perStatus.Nieuw ?? 0} nieuw · ${kpis.perStatus.Live ?? 0} live`} />
        <Kpi label="Actieve codes" value={kpis.activeCodes} sublabel="uitgegeven & actief" />
        <Kpi label="Activaties totaal" value={kpis.totalActivations} sublabel={`${kpis.activeActivations} nu actief`} accent />
        <Kpi label="Activaties 7d / 30d" value={kpis.last7DaysActivations} sublabel={`${kpis.last30DaysActivations} laatste 30 dagen`} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-white p-3">
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border-soft)] px-3">
          <Search className="size-3.5 text-[color:var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek organisatie, code, stad..."
            className="h-9 w-72 bg-transparent text-sm outline-none"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          label="Status"
        />
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={["Alle", "A", "B", "C"]}
          label="Prioriteit"
        />
        <div className="ml-auto text-xs text-[color:var(--text-muted)]">
          {filtered.length} van {orgs.length}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--surface-2)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Organisatie</th>
              <th className="px-4 py-3">Pri</th>
              <th className="px-4 py-3">Segment</th>
              <th className="px-4 py-3">Outreach</th>
              <th className="px-4 py-3">Pilot</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Activaties</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border-soft)]">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-[color:var(--surface-2)]">
                <td className="px-4 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                  {o.externalId}
                </td>
                <td className="px-4 py-3 font-medium">
                  <div>{o.organizationName}</div>
                  {o.city && (
                    <div className="text-xs text-[color:var(--text-muted)]">{o.city}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PriorityPill priority={o.priority} />
                </td>
                <td className="px-4 py-3 text-xs text-[color:var(--text-muted)]">
                  {o.segment}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={o.outreachStatus} />
                </td>
                <td className="px-4 py-3 text-xs">{o.pilotStatus}</td>
                <td className="px-4 py-3">
                  {o.partnerCode ? (
                    <code className="font-mono text-xs">{o.partnerCode}</code>
                  ) : (
                    <span className="text-xs text-[color:var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.partnerCode
                    ? `${o.activeActivations} / ${o.freeCodesCount ?? "?"}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/partners/${o.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[color:var(--navy)] hover:bg-[color:var(--aqua-50)]"
                  >
                    Open
                    <ExternalLink className="size-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
            Geen partners gevonden met deze filters.
          </div>
        )}
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: number;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-4">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-bold"
        style={{ color: accent ? "var(--orange-600)" : "var(--navy)" }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-xs text-[color:var(--text-muted)]">
          {sublabel}
        </div>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border-soft)] px-3">
      <Filter className="size-3.5 text-[color:var(--text-muted)]" />
      <span className="text-xs text-[color:var(--text-muted)]">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 bg-transparent text-sm outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function PriorityPill({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-[color:var(--text-muted)]">—</span>;
  const colors: Record<string, { bg: string; text: string }> = {
    A: { bg: "color-mix(in srgb, var(--orange) 12%, white)", text: "var(--orange-600)" },
    B: { bg: "color-mix(in srgb, var(--aqua) 14%, white)", text: "var(--navy)" },
    C: { bg: "var(--bg-deep)", text: "var(--text-muted)" },
  };
  const c = colors[priority] ?? colors.C;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {PRIORITY_LABEL[priority] ?? priority}
    </span>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const colors: Record<string, { bg: string; text: string }> = {
    Nieuw: { bg: "var(--bg-deep)", text: "var(--text-muted)" },
    Benaderd: { bg: "color-mix(in srgb, var(--aqua) 14%, white)", text: "var(--navy)" },
    "In gesprek": { bg: "color-mix(in srgb, var(--aqua) 20%, white)", text: "var(--navy)" },
    Akkoord: { bg: "color-mix(in srgb, var(--green) 14%, white)", text: "var(--green)" },
    Live: { bg: "color-mix(in srgb, var(--green) 18%, white)", text: "var(--green)" },
    Afgewezen: { bg: "color-mix(in srgb, var(--red) 12%, white)", text: "var(--red)" },
  };
  const c = colors[status] ?? colors.Nieuw;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}
