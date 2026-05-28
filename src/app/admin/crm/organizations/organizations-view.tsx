"use client";

import { useMemo, useState } from "react";
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
import { CrmTabs } from "../crm-tabs";
import { OrgSidePanel } from "./org-side-panel";
import { NewOrgPanel } from "./new-org-panel";

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
    | "lead_form";
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
  kvk: string | null;
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
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialOrgs.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
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
  }, [initialOrgs, search, statusFilter]);

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
    if (res.ok) router.refresh();
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
        <ListView orgs={filtered} onOpen={(id) => setSelectedOrgId(id)} />
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

function ListView({
  orgs,
  onOpen,
}: {
  orgs: OrgRow[];
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border bg-white"
      style={{ borderColor: "var(--border)" }}
    >
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-[color:var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">Bedrijf</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Bron</th>
            <th className="px-4 py-3">Seats</th>
            <th className="px-4 py-3">Deal</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Actie</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr
              key={o.id}
              onClick={() => onOpen(o.id)}
              className="cursor-pointer border-b last:border-b-0 hover:bg-[color:var(--aqua-50)]"
              style={{ borderColor: "var(--border)" }}
            >
              <td className="px-4 py-3">
                <div className="font-bold text-[color:var(--navy)]">{o.name}</div>
                {o.city && (
                  <div className="text-xs text-[color:var(--text-muted)]">
                    {o.city}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {o.primaryContactName ? (
                  <>
                    <div>{o.primaryContactName}</div>
                    <div className="text-xs text-[color:var(--text-muted)]">
                      {o.primaryContactEmail}
                    </div>
                  </>
                ) : (
                  <span className="text-[color:var(--text-muted)]">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={o.status} />
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const src = deriveCustomerSource({ crmOrgSource: o.source });
                  return <SourceBadge source={src.key} detail={src.detail} />;
                })()}
              </td>
              <td className="px-4 py-3">{o.proposedSeats ?? "—"}</td>
              <td className="px-4 py-3 font-semibold">
                {fmtCents(o.proposedAmountCents)}
              </td>
              <td className="px-4 py-3 text-xs text-[color:var(--text-muted)]">
                {o.ownerName ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs">
                {o.nextAction ? (
                  <span className="font-semibold text-[color:var(--orange-600)]">
                    {o.nextAction}
                  </span>
                ) : (
                  <span className="text-[color:var(--text-muted)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = STATUSES.find((x) => x.key === status);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
      style={{
        background: `${s?.color ?? "#94a3b8"}20`,
        color: s?.color ?? "#94a3b8",
      }}
    >
      <span
        className="inline-block size-1.5 rounded-full"
        style={{ background: s?.color ?? "#94a3b8" }}
      />
      {s?.label ?? status}
    </span>
  );
}
