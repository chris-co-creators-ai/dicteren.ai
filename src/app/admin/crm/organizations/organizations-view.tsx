"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Kanban as KanbanIcon,
  List,
  Plus,
  Search,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { SourceBadge } from "@/components/admin/SourceBadge";
import { deriveCustomerSource } from "@/lib/services/customerSource";
import { toast } from "sonner";
import { CrmTabs } from "../crm-tabs";
import { OrgSidePanel } from "./org-side-panel";
import { NewOrgPanel } from "./new-org-panel";
import { NL_PROVINCES } from "@/lib/services/nlProvinces";
import { MKB_BRANCHES } from "@/lib/services/mkbBranches";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
const TEMPS = [
  { key: "cold", label: "Koud" },
  { key: "lukewarm", label: "Lauw" },
  { key: "warm", label: "Warm" },
  { key: "hot", label: "Heet" },
] as const;

const STATUSES = [
  { key: "lead", label: "Nieuw", color: "#94a3b8" },
  { key: "contacted", label: "Benaderd", color: "#64748b" },
  { key: "qualified", label: "Gekwalificeerd", color: "#3b82f6" },
  { key: "proposal_sent", label: "Betaal-link verzonden", color: "#f59e0b" },
  { key: "negotiating", label: "In gesprek", color: "#8b5cf6" },
  { key: "won", label: "Klant", color: "#22c55e" },
  { key: "lost", label: "Verloren", color: "#ef4444" },
] as const;

export type OrgRow = {
  id: string;
  name: string;
  status: (typeof STATUSES)[number]["key"];
  source:
    | "am_outreach"
    | "self_service"
    | "consumer_upgrade"
    | "csv_import"
    | "lead_form"
    | "reseller_recruitment";
  temperature: string | null;
  accountOwnerId: string | null;
  ownerName: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  contactCount: number;
  openTaskCount: number;
  proposedSeats: number | null;
  proposedAmountCents: number | null;
  nextAction: string | null;
  nextActionAt: string | null;
  city: string | null;
  province: string | null;
  kvk: string | null;
  vatNumber: string | null;
  website: string | null;
  industry: string | null;
  niche: string | null;
  specialisatie: string | null;
  companySize: string | null;
  revenueRange: string | null;
  totalReach: number | null;
  brancheVereniging: string | null;
  aantalVestigingen: number | null;
  hoofdkantoor: string | null;
  proposedPlanSlug: string | null;
  discountCode: string | null;
  updatedAt: string;
  createdAt: string;
};

type Props = {
  currentUserId: string;
  organizations: OrgRow[];
  kpis: {
    totalOrgs: number;
    openDeals: number;
    proposalsOut: number;
    wonThisMonth: number;
    totalForecastCents: number;
  };
  admins: { id: string; name: string; email: string }[];
  activeTab: "people" | "organizations";
  onTabChange: (k: "people" | "organizations") => void;
};

function fmtCents(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function OrganizationsView({
  currentUserId,
  organizations: initialOrgs,
  kpis,
  admins,
  activeTab,
  onTabChange,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [provinceFilter, setProvinceFilter] = useState<string>("");
  const [amFilter, setAmFilter] = useState<string>("");
  const [brancheFilter, setBrancheFilter] = useState<string>("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Inline-edit van willekeurig org-veld; server valideert (FSM-gate op status).
  async function patchField(orgId: string, field: string, value: unknown) {
    const res = await fetch(`/api/admin/crm/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.message ?? "Wijziging niet opgeslagen");
    }
    router.refresh();
  }

  const filtered = useMemo(() => {
    return initialOrgs.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (provinceFilter && o.province !== provinceFilter) return false;
      if (amFilter && o.accountOwnerId !== amFilter) return false;
      if (brancheFilter && o.industry !== brancheFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.name.toLowerCase().includes(q) ||
          o.primaryContactName?.toLowerCase().includes(q) ||
          o.primaryContactEmail?.toLowerCase().includes(q) ||
          o.city?.toLowerCase().includes(q) ||
          o.kvk?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialOrgs, search, statusFilter, provinceFilter, amFilter, brancheFilter]);

  const byStatus = useMemo(() => {
    const m = new Map<string, OrgRow[]>();
    for (const s of STATUSES) m.set(s.key, []);
    for (const o of filtered) {
      const arr = m.get(o.status);
      if (arr) arr.push(o);
    }
    return m;
  }, [filtered]);

  async function handleStatusChange(orgId: string, newStatus: string) {
    const res = await fetch(`/api/admin/crm/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    // FSM-gate: vereiste velden ontbreken → toon welke, draai de move terug.
    toast.error(data?.message ?? "Statuswijziging niet toegestaan");
    router.refresh();
  }

  return (
    <>
      <AdminTopbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 lg:px-7">
        <CrmTabs active={activeTab} onChange={onTabChange} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Totaal" value={String(kpis.totalOrgs)} />
        <KpiCard label="Open deals" value={String(kpis.openDeals)} />
        <KpiCard label="Betaal-links uit" value={String(kpis.proposalsOut)} />
        <KpiCard label="Klanten deze maand" value={String(kpis.wonThisMonth)} />
        <KpiCard label="Forecast" value={fmtCents(kpis.totalForecastCents)} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-muted)]"
            strokeWidth={2}
          />
          <input
            type="search"
            placeholder="Zoek op bedrijf, contact, e-mail of KvK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="">Alle statussen</option>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="">Alle provincies</option>
          {NL_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={amFilter}
          onChange={(e) => setAmFilter(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="">Alle account managers</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={brancheFilter}
          onChange={(e) => setBrancheFilter(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="">Alle branches</option>
          {MKB_BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <div
          className="inline-flex items-center gap-1 rounded-lg border bg-white p-1 text-xs"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 font-semibold ${
              view === "kanban"
                ? "bg-[color:var(--navy)] text-white"
                : "text-[color:var(--text-muted)]"
            }`}
          >
            <KanbanIcon className="size-3.5" strokeWidth={2} /> Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 font-semibold ${
              view === "list"
                ? "bg-[color:var(--navy)] text-white"
                : "text-[color:var(--text-muted)]"
            }`}
          >
            <List className="size-3.5" strokeWidth={2} /> Lijst
          </button>
        </div>
        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white"
          style={{ background: "#FF8441" }}
        >
          <Plus className="size-4" strokeWidth={2.4} />
          Nieuwe organisatie
        </button>
      </div>

      {/* View */}
      {filtered.length > 0 && view === "kanban" && (
        <KanbanBoard
          byStatus={byStatus}
          onOpen={(id) => setSelectedOrgId(id)}
          onMove={handleStatusChange}
        />
      )}
      {filtered.length > 0 && view === "list" && (
        <InlineOrgGrid
          orgs={filtered}
          admins={admins}
          onOpen={(id) => setSelectedOrgId(id)}
          onStatusChange={handleStatusChange}
          patchField={patchField}
        />
      )}

      {filtered.length === 0 && (
        <div
          className="rounded-xl border bg-white p-10 text-center"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="mx-auto grid size-14 place-items-center rounded-2xl"
            style={{ background: "var(--aqua-50)" }}
          >
            <Building2
              className="size-7"
              style={{ color: "var(--navy)" }}
              strokeWidth={1.6}
            />
          </div>
          <h3 className="mt-4 text-base font-bold text-[color:var(--navy)]">
            {initialOrgs.length === 0
              ? "Nog geen organisaties in je pijplijn"
              : "Geen resultaten voor je filter"}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {initialOrgs.length === 0
              ? "Maak je eerste zakelijke deal aan."
              : "Pas je zoekterm of filter aan."}
          </p>
          {initialOrgs.length === 0 && (
            <button
              type="button"
              onClick={() => setNewModalOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: "#FF8441" }}
            >
              <Plus className="size-4" strokeWidth={2.4} />
              Nieuwe organisatie
            </button>
          )}
        </div>
      )}

      {newModalOpen && (
        <NewOrgPanel
          admins={admins}
          currentUserId={currentUserId}
          onClose={() => setNewModalOpen(false)}
          onCreated={(id) => {
            setNewModalOpen(false);
            setSelectedOrgId(id);
            router.refresh();
          }}
        />
      )}

      {selectedOrgId && (
        <OrgSidePanel
          orgId={selectedOrgId}
          admins={admins}
          onClose={() => setSelectedOrgId(null)}
          onChanged={() => router.refresh()}
        />
      )}
      </main>
    </>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border bg-white p-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-[color:var(--navy)]">
        {value}
      </div>
    </div>
  );
}

function KanbanBoard({
  byStatus,
  onOpen,
  onMove,
}: {
  byStatus: Map<string, OrgRow[]>;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map((s) => {
        const items = byStatus.get(s.key) ?? [];
        return (
          <div
            key={s.key}
            className="min-w-[260px] flex-shrink-0 rounded-xl border bg-[color:var(--bg)] p-2"
            style={{ borderColor: "var(--border)" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) onMove(id, s.key);
            }}
          >
            <div className="mb-2 flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-xs font-bold text-[color:var(--navy)]">
                  {s.label}
                </span>
              </div>
              <span className="text-xs text-[color:var(--text-muted)]">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((o) => (
                <div
                  key={o.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", o.id)
                  }
                  onClick={() => onOpen(o.id)}
                  className="cursor-pointer rounded-lg border bg-white p-3 text-xs shadow-sm hover:shadow-md"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-[color:var(--navy)]">
                      {o.name}
                    </div>
                    {(() => {
                      const src = deriveCustomerSource({ crmOrgSource: o.source });
                      return (
                        <SourceBadge
                          source={src.key}
                          detail={src.detail}
                          compact
                        />
                      );
                    })()}
                  </div>
                  {o.primaryContactName && (
                    <div className="mt-1 text-[color:var(--text-muted)]">
                      {o.primaryContactName}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[color:var(--text-muted)]">
                    <span>
                      {o.proposedSeats ? `${o.proposedSeats} seats` : "—"}
                    </span>
                    <span className="font-semibold text-[color:var(--navy)]">
                      {fmtCents(o.proposedAmountCents)}
                    </span>
                  </div>
                  {o.openTaskCount > 0 && (
                    <div className="mt-1.5 text-[10px] font-semibold text-[color:var(--orange-600)]">
                      {o.openTaskCount} open taak
                      {o.openTaskCount > 1 ? "ken" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Dense inline-editbare grid (zelfde stijl als de Personen-tab). Alle
// bedrijfsvelden inline editbaar; horizontale scroll + sticky actie-kolom.
const ORG_COLS: { key: string; label: string; w: number }[] = [
  { key: "name", label: "Bedrijf", w: 210 },
  { key: "status", label: "Status", w: 160 },
  { key: "temperature", label: "Temp.", w: 110 },
  { key: "owner", label: "Account manager", w: 160 },
  { key: "industry", label: "Branche", w: 180 },
  { key: "brancheVereniging", label: "Branchevereniging", w: 150 },
  { key: "companySize", label: "Bedrijfsgrootte", w: 130 },
  { key: "aantalVestigingen", label: "Vestigingen", w: 100 },
  { key: "hoofdkantoor", label: "Hoofdkantoor", w: 140 },
  { key: "city", label: "Stad", w: 130 },
  { key: "province", label: "Provincie", w: 140 },
  { key: "kvk", label: "KVK", w: 110 },
  { key: "vatNumber", label: "BTW-nummer", w: 140 },
  { key: "specialisatie", label: "Specialisatie", w: 160 },
  { key: "totalReach", label: "Bereik", w: 90 },
  { key: "proposedSeats", label: "Seats", w: 80 },
  { key: "proposedAmountCents", label: "Deal", w: 110 },
  { key: "contact", label: "Contact", w: 190 },
  { key: "tasks", label: "Taken", w: 70 },
];
const ORG_TABLE_WIDTH = ORG_COLS.reduce((s, c) => s + c.w, 0) + 44;

function InlineOrgGrid({
  orgs,
  admins,
  onOpen,
  onStatusChange,
  patchField,
}: {
  orgs: OrgRow[];
  admins: { id: string; name: string; email: string }[];
  onOpen: (id: string) => void;
  onStatusChange: (orgId: string, status: string) => void;
  patchField: (orgId: string, field: string, value: unknown) => void;
}) {
  return (
    <div
      className="overflow-x-auto rounded-xl border bg-white"
      style={{ borderColor: "var(--border)" }}
    >
      <table
        className="border-separate border-spacing-0 text-xs"
        style={{ tableLayout: "fixed", width: ORG_TABLE_WIDTH }}
      >
        <colgroup>
          {ORG_COLS.map((c) => (
            <col key={c.key} style={{ width: c.w }} />
          ))}
          <col style={{ width: 44 }} />
        </colgroup>
        <thead>
          <tr style={{ background: "var(--bg)" }}>
            {ORG_COLS.map((c) => (
              <th
                key={c.key}
                className="h-9 border-b border-r px-2 text-left font-medium text-[color:var(--text-soft)]"
                style={{ borderColor: "var(--border-soft)" }}
              >
                {c.label}
              </th>
            ))}
            <th
              className="sticky right-0 z-20 h-9 border-b border-l bg-[color:var(--bg)] px-2 text-center font-medium text-[color:var(--text-soft)]"
              style={{ borderColor: "var(--border-soft)" }}
            >
              ↗
            </th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id} className="group bg-white hover:bg-[color:var(--bg)]">
              {/* Bedrijf */}
              <Cell>
                <GridText value={o.name} onSave={(v) => patchField(o.id, "name", v)} bold />
              </Cell>
              {/* Status */}
              <Cell>
                <select
                  value={o.status}
                  onChange={(e) => onStatusChange(o.id, e.target.value)}
                  className="w-full cursor-pointer bg-transparent text-xs outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Cell>
              {/* Temperatuur */}
              <Cell>
                <GridSelect
                  value={o.temperature}
                  options={TEMPS.map((t) => ({ value: t.key, label: t.label }))}
                  onSave={(v) => patchField(o.id, "temperature", v)}
                />
              </Cell>
              {/* Account manager */}
              <Cell>
                <GridSelect
                  value={o.accountOwnerId}
                  options={admins.map((a) => ({ value: a.id, label: a.name }))}
                  onSave={(v) => patchField(o.id, "accountOwnerId", v)}
                />
              </Cell>
              {/* Branche */}
              <Cell>
                <GridSelect
                  value={o.industry}
                  options={MKB_BRANCHES.map((b) => ({ value: b, label: b }))}
                  onSave={(v) => patchField(o.id, "industry", v)}
                />
              </Cell>
              {/* Branchevereniging */}
              <Cell>
                <GridText
                  value={o.brancheVereniging}
                  onSave={(v) => patchField(o.id, "brancheVereniging", v)}
                />
              </Cell>
              {/* Bedrijfsgrootte */}
              <Cell>
                <GridSelect
                  value={o.companySize}
                  options={COMPANY_SIZES.map((s) => ({ value: s, label: s }))}
                  onSave={(v) => patchField(o.id, "companySize", v)}
                />
              </Cell>
              {/* Vestigingen */}
              <Cell>
                <GridNum
                  value={o.aantalVestigingen}
                  onSave={(v) => patchField(o.id, "aantalVestigingen", v)}
                />
              </Cell>
              {/* Hoofdkantoor */}
              <Cell>
                <GridText
                  value={o.hoofdkantoor}
                  onSave={(v) => patchField(o.id, "hoofdkantoor", v)}
                />
              </Cell>
              {/* Stad */}
              <Cell>
                <GridText value={o.city} onSave={(v) => patchField(o.id, "city", v)} />
              </Cell>
              {/* Provincie */}
              <Cell>
                <GridSelect
                  value={o.province}
                  options={NL_PROVINCES.map((p) => ({ value: p, label: p }))}
                  onSave={(v) => patchField(o.id, "province", v)}
                />
              </Cell>
              {/* KVK */}
              <Cell>
                <GridText value={o.kvk} onSave={(v) => patchField(o.id, "kvk", v)} />
              </Cell>
              {/* BTW */}
              <Cell>
                <GridText value={o.vatNumber} onSave={(v) => patchField(o.id, "vatNumber", v)} />
              </Cell>
              {/* Specialisatie */}
              <Cell>
                <GridText
                  value={o.specialisatie}
                  onSave={(v) => patchField(o.id, "specialisatie", v)}
                />
              </Cell>
              {/* Bereik */}
              <Cell>
                <GridNum value={o.totalReach} onSave={(v) => patchField(o.id, "totalReach", v)} />
              </Cell>
              {/* Seats */}
              <Cell>
                <GridNum
                  value={o.proposedSeats}
                  onSave={(v) => patchField(o.id, "proposedSeats", v)}
                />
              </Cell>
              {/* Deal (read-only, € afgeleid) */}
              <Cell>
                <span className="font-semibold text-[color:var(--navy)]">
                  {fmtCents(o.proposedAmountCents)}
                </span>
              </Cell>
              {/* Contact (read-only) */}
              <Cell>
                {o.primaryContactName ? (
                  <span className="truncate" title={o.primaryContactEmail ?? ""}>
                    {o.primaryContactName}
                  </span>
                ) : (
                  <span className="text-[color:var(--text-soft)]">—</span>
                )}
              </Cell>
              {/* Taken (read-only) */}
              <Cell>
                {o.openTaskCount > 0 ? (
                  <span className="font-semibold text-[color:var(--orange-600)]">
                    {o.openTaskCount}
                  </span>
                ) : (
                  <span className="text-[color:var(--text-soft)]">0</span>
                )}
              </Cell>
              {/* Sticky actie-kolom */}
              <td
                className="sticky right-0 z-10 h-8 border-b border-l bg-white px-1 text-center align-middle group-hover:bg-[color:var(--bg)]"
                style={{ borderColor: "var(--border-soft)" }}
              >
                <button
                  onClick={() => onOpen(o.id)}
                  className="text-blue-600 opacity-60 hover:opacity-100"
                  title="Open organisatie (details, betaling, activiteit, taken)"
                >
                  →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="h-8 truncate border-b border-r px-2 align-middle"
      style={{ borderColor: "var(--border-soft)" }}
    >
      {children}
    </td>
  );
}

function GridText({
  value,
  onSave,
  bold,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
  bold?: boolean;
}) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const nv = v.trim();
        if ((value ?? "") !== nv) onSave(nv || null);
      }}
      className={`w-full bg-transparent text-xs outline-none focus:bg-white ${
        bold ? "font-bold text-[color:var(--navy)]" : ""
      }`}
    />
  );
}

function GridNum({
  value,
  onSave,
}: {
  value: number | null;
  onSave: (v: number | null) => void;
}) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => setV(value == null ? "" : String(value)), [value]);
  return (
    <input
      value={v}
      inputMode="numeric"
      onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => {
        const nv = v === "" ? null : Number(v);
        if (nv !== value) onSave(nv);
      }}
      className="w-full bg-transparent text-xs outline-none focus:bg-white"
    />
  );
}

function GridSelect({
  value,
  options,
  onSave,
}: {
  value: string | null;
  options: { value: string; label: string }[];
  onSave: (v: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onSave(e.target.value || null)}
      className="w-full cursor-pointer bg-transparent text-xs outline-none"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
