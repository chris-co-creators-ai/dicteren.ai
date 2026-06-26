"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FUNNEL_TRACK } from "@/lib/services/partnerFunnelShared";

type CrmStage =
  | "lead"
  | "prospect"
  | "mql"
  | "sql"
  | "customer"
  | "lost"
  | "churned"
  | "reseller";

type Temperature = "cold" | "lukewarm" | "warm" | "hot";

export type KanbanCustomer = {
  id: string;
  name: string;
  email: string;
  crmStage: CrmStage;
  /** Funnel-spoor (migratie 0052). Bepaalt op welk bord deze kaart hoort. */
  prospectType: "eindklant" | "reseller";
  /** Afgeleide partner-funnel-kolom (exact `deriveFunnelColumn`). Alleen bij reseller. */
  funnelColumn: string;
  crmTemperature: Temperature;
  segment: string;
  assignedToUserId: string | null;
  paidLicenseCount: number;
  trialStatus: string | null;
  accountOwner: { name: string; code: string } | null;
};

type AdminUser = {
  id: string;
  name: string;
};

// Eindklant-funnel: de klassieke sales-stages (sleepbaar, zet customer_stage).
const EINDKLANT_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "#6B7280" },
  { key: "prospect", label: "Prospect", color: "#3B82F6" },
  { key: "mql", label: "MQL", color: "#A855F7" },
  { key: "sql", label: "SQL", color: "#EAB308" },
  { key: "customer", label: "Klant", color: "#22C55E" },
  { key: "lost", label: "Verloren", color: "#EF4444" },
  { key: "churned", label: "Churned", color: "#F97316" },
];

// Reseller-funnel: EXACT de 7-stage partner-funnel uit partnerFunnelShared
// (`FUNNEL_TRACK` + `deriveFunnelColumn`), dezelfde waarheid als de Partner-cockpit.
// NIET sleepbaar — de progressie volgt de flow (deck sturen, bezoek-tracking,
// aanmelding, afspraak-vinkjes, publiceren), niet handmatig slepen. De AM werkt 'm
// bij via de Partner-tab. "Niet nu" (lost/churned/do-not-call) als zijspoor erachter.
const FUNNEL_COLORS: Record<string, string> = {
  nieuw: "#6B7280",
  deck_verstuurd: "#3B82F6",
  deck_bekeken: "#06B6D4",
  geinteresseerd: "#A855F7",
  afspraak_rond: "#EAB308",
  brand_check: "#F59E0B",
  actief: "#14B8A6",
  niet_nu: "#9CA3AF",
};
const RESELLER_COLUMNS: { key: string; label: string; color: string }[] = [
  ...FUNNEL_TRACK.map((s) => ({
    key: s.key,
    label: s.label,
    color: FUNNEL_COLORS[s.key] ?? "#6B7280",
  })),
  { key: "niet_nu", label: "Niet nu", color: FUNNEL_COLORS.niet_nu },
];

const TEMP_DOT: Record<Temperature, string> = {
  cold: "#3B82F6",
  lukewarm: "#06B6D4",
  warm: "#F97316",
  hot: "#EF4444",
};

export function KanbanView({
  customers,
  adminUsers,
  onStageChange,
  onOpenRecord,
  funnel = "eindklant",
}: {
  customers: KanbanCustomer[];
  adminUsers: AdminUser[];
  onStageChange: (userId: string, stage: CrmStage) => void;
  /** Opent het persoon-side-panel voor deze kaart (zelfde panel als de tabel-rij).
   *  Prospects hebben geen auth.user, dus een detail-route 404't — altijd het panel. */
  onOpenRecord: (id: string) => void;
  /** Welk funnel-spoor dit bord toont. Reseller-kolommen zijn afgeleid + read-only. */
  funnel?: "eindklant" | "reseller";
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const isReseller = funnel === "reseller";
  const columns = isReseller ? RESELLER_COLUMNS : EINDKLANT_COLUMNS;
  const stageOf = (c: KanbanCustomer): string =>
    isReseller ? c.funnelColumn : c.crmStage;

  const grouped = new Map<string, KanbanCustomer[]>();
  for (const col of columns) grouped.set(col.key, []);
  for (const c of customers) {
    const list = grouped.get(stageOf(c));
    if (list) list.push(c);
  }

  const assigneeName = (id: string | null): string => {
    if (!id) return "Niet toegewezen";
    return adminUsers.find((u) => u.id === id)?.name ?? "Onbekend";
  };

  return (
    <div className="overflow-x-auto px-2 py-3">
      <div className="flex gap-3 min-w-max">
        {columns.map((col) => {
          const items = grouped.get(col.key) ?? [];
          return (
            <div
              key={col.key}
              onDragOver={(e) => !isReseller && e.preventDefault()}
              onDrop={() => {
                if (!isReseller && dragId) {
                  onStageChange(dragId, col.key as CrmStage);
                  setDragId(null);
                }
              }}
              className="w-72 shrink-0 rounded-2xl bg-[color:var(--bg)] p-2"
            >
              <div className="mb-2 flex items-center gap-2 px-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: col.color }}
                />
                <span className="text-sm font-bold">{col.label}</span>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[color:var(--border-soft)] p-3 text-center text-xs text-[color:var(--text-soft)]">
                    {isReseller ? "Geen contacten" : "Sleep een klant hierheen"}
                  </div>
                ) : (
                  items.map((c) => (
                    <div
                      key={c.id}
                      draggable={!isReseller}
                      onDragStart={() => !isReseller && setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "rounded-xl border border-[color:var(--border-soft)] bg-white p-3 shadow-sm transition-shadow",
                        dragId === c.id && "opacity-50",
                        isReseller
                          ? "hover:shadow-md"
                          : "hover:shadow-md cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenRecord(c.id)}
                        className="block w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1 size-2 shrink-0 rounded-full"
                            style={{
                              background: TEMP_DOT[c.crmTemperature],
                            }}
                            title={c.crmTemperature}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {c.name}
                            </div>
                            <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                              {c.email}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 text-[0.625rem]">
                          <span className="rounded-full bg-[color:var(--bg-deep)] px-1.5 py-0.5 font-semibold">
                            {c.segment}
                          </span>
                          {c.paidLicenseCount > 0 && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 font-semibold text-green-800">
                              {c.paidLicenseCount}× lic
                            </span>
                          )}
                          {c.trialStatus === "active" && (
                            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-800">
                              trial
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-[0.625rem] text-[color:var(--text-soft)]">
                          {assigneeName(c.assignedToUserId)}
                          {c.accountOwner && ` · ${c.accountOwner.code}`}
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
