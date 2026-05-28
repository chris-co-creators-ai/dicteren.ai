"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Columns3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GripVertical,
  Kanban,
  List,
  Plus,
  Search,
  Settings2,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { CrmTabs } from "./crm-tabs";
import { cn } from "@/lib/utils";
import {
  COLUMN_LABELS,
  DEFAULT_VISIBLE_COLUMNS,
  type ColumnKey,
  type ColumnPrefs,
} from "@/lib/services/columnPrefsShared";
import { KanbanView } from "./kanban-view";
import { AddProspectModal } from "./add-prospect-modal";
import { CsvImportModal } from "./csv-import-modal";
import { InlineProspectRow } from "./inline-prospect-row";

type CustomColumnDef = {
  id: string;
  key: string;
  name: string;
  type: "text" | "number" | "date" | "select";
  options: string[] | null;
  position: number;
};

type Stage =
  | "lead"
  | "trial_active"
  | "trial_expired"
  | "converted";
type Segment = "consumer" | "team" | "partner" | "trial" | "lead";

type CrmStage =
  | "lead"
  | "prospect"
  | "mql"
  | "sql"
  | "customer"
  | "lost"
  | "churned";

type Temperature = "cold" | "lukewarm" | "warm" | "hot";

type Customer = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  createdAt: string;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  trialStatus: string | null;
  paidLicenseCount: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  stage: Stage;
  segment: Segment;
  licenseSource: string | null;
  discountType: string | null;
  discountValue: number | null;
  mollieCustomerId: string | null;
  subscriptionStatus: string | null;
  nextBillingAt: string | null;
  accountOwner: {
    affiliateId: string;
    code: string;
    name: string;
    convertedAt: string | null;
  } | null;
  discountCodeUsed: {
    id: string;
    code: string;
    affiliateId: string | null;
  } | null;
  crmStage: CrmStage;
  crmTemperature: Temperature;
  assignedToUserId: string | null;
  notes: string | null;
  customFields: Record<string, string | number | null> | null;
  listIds: string[];
};

type AffiliateOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type DiscountOption = {
  id: string;
  code: string;
  affiliateId: string | null;
  isActive: boolean;
};

type LeadListOption = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  memberCount: number;
  ownerUserId: string | null;
  isShared: boolean;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
};

type Kpi = { label: string; value: string; detail: string };

const STAGE_OPTIONS: { key: CrmStage; label: string; chip: string }[] = [
  { key: "lead", label: "Lead", chip: "bg-gray-100 text-gray-800" },
  {
    key: "prospect",
    label: "Prospect",
    chip: "bg-blue-100 text-blue-800",
  },
  { key: "mql", label: "MQL", chip: "bg-purple-100 text-purple-800" },
  {
    key: "sql",
    label: "SQL",
    chip: "bg-yellow-100 text-yellow-800",
  },
  {
    key: "customer",
    label: "Klant",
    chip: "bg-green-100 text-green-800",
  },
  {
    key: "lost",
    label: "Verloren",
    chip: "bg-red-100 text-red-800",
  },
  {
    key: "churned",
    label: "Churned",
    chip: "bg-orange-100 text-orange-800",
  },
];

const TEMP_OPTIONS: { key: Temperature; label: string; chip: string }[] = [
  { key: "cold", label: "Koud", chip: "bg-blue-100 text-blue-800" },
  {
    key: "lukewarm",
    label: "Lauw",
    chip: "bg-cyan-100 text-cyan-800",
  },
  { key: "warm", label: "Warm", chip: "bg-orange-100 text-orange-800" },
  { key: "hot", label: "Heet", chip: "bg-red-100 text-red-800" },
];

const SEGMENT_META: Record<
  Segment,
  { label: string; chipBg: string; chipFg: string }
> = {
  team: {
    label: "Team",
    chipBg: "color-mix(in srgb, var(--navy) 14%, white)",
    chipFg: "var(--navy)",
  },
  consumer: {
    label: "Consumer",
    chipBg: "color-mix(in srgb, var(--aqua) 18%, white)",
    chipFg: "var(--navy)",
  },
  partner: {
    label: "Partner",
    chipBg: "color-mix(in srgb, var(--orange) 14%, white)",
    chipFg: "var(--orange-600)",
  },
  trial: {
    label: "Trial",
    chipBg: "color-mix(in srgb, var(--green) 14%, white)",
    chipFg: "var(--green)",
  },
  lead: {
    label: "Lead",
    chipBg: "var(--surface-2)",
    chipFg: "var(--text-muted)",
  },
};

const LIST_COLOR_BG: Record<string, string> = {
  blue: "#3B82F6",
  green: "#22C55E",
  orange: "#F97316",
  red: "#EF4444",
  purple: "#A855F7",
  gray: "#6B7280",
  navy: "#1E3A8A",
  aqua: "#06B6D4",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDiscount(
  type: string | null,
  value: number | null,
): string | null {
  if (!type || value === null) return null;
  if (type === "free_months") return `${value} mnd gratis`;
  if (type === "lifetime") return "Lifetime gratis";
  if (type === "percentage") return `-${value}%`;
  if (type === "fixed") return `-€${(value / 100).toFixed(2)}`;
  return `${type}: ${value}`;
}

export function CrmView({
  currentUserId,
  canCreateList,
  customers,
  affiliates,
  discountCodes,
  lists,
  adminUsers,
  columnPrefs,
  customColumns,
  kpis,
  activeTab,
  onTabChange,
}: {
  currentUserId: string;
  canCreateList: boolean;
  customers: Customer[];
  affiliates: AffiliateOption[];
  discountCodes: DiscountOption[];
  lists: LeadListOption[];
  adminUsers: AdminUser[];
  columnPrefs: ColumnPrefs;
  customColumns: CustomColumnDef[];
  stageCounts: Record<Stage, number>;
  kpis: Kpi[];
  activeTab: "people" | "organizations";
  onTabChange: (k: "people" | "organizations") => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [activeListId, setActiveListId] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tempFilter, setTempFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [discountFilter, setDiscountFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [addingInline, setAddingInline] = useState(false);
  const [notesFor, setNotesFor] = useState<Customer | null>(null);

  // Visible/order werken nu met (built-in + custom) ColumnKey-strings.
  // Custom-column keys hebben prefix "custom:" (zie services/customColumns.ts).
  const allKeys = useMemo<string[]>(
    () => [
      ...DEFAULT_VISIBLE_COLUMNS,
      ...customColumns.map((c) => c.key),
    ],
    [customColumns],
  );

  const [visible, setVisible] = useState<string[]>(
    columnPrefs.visibleColumns as string[],
  );
  const [order, setOrder] = useState<string[]>(
    columnPrefs.columnOrder as string[],
  );

  // Persistier prefs bij wijziging (debounced via 500ms).
  useEffect(() => {
    const t = setTimeout(() => {
      void fetch("/api/admin/crm/column-prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visibleColumns: visible,
          columnOrder: order,
        }),
      });
    }, 500);
    return () => clearTimeout(t);
  }, [visible, order]);

  // Customers gefilterd op de tab + alle filters.
  const filtered = useMemo(() => {
    const inList =
      activeListId === "all"
        ? null
        : new Set(
            customers
              .filter((c) => c.listIds.includes(activeListId))
              .map((c) => c.id),
          );
    return customers.filter((r) => {
      if (inList && !inList.has(r.id)) return false;
      if (stageFilter !== "all" && r.crmStage !== stageFilter) return false;
      if (tempFilter !== "all" && r.crmTemperature !== tempFilter)
        return false;
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "none") {
          if (r.assignedToUserId) return false;
        } else if (r.assignedToUserId !== assigneeFilter) return false;
      }
      if (ownerFilter !== "all") {
        if (ownerFilter === "none") {
          if (r.accountOwner) return false;
        } else if (r.accountOwner?.affiliateId !== ownerFilter) return false;
      }
      if (discountFilter !== "all") {
        if (discountFilter === "none") {
          if (r.discountCodeUsed) return false;
        } else if (r.discountCodeUsed?.id !== discountFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.mollieCustomerId?.toLowerCase().includes(q) ?? false) ||
          (r.accountOwner?.name.toLowerCase().includes(q) ?? false) ||
          (r.discountCodeUsed?.code.toLowerCase().includes(q) ?? false) ||
          (r.notes?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [
    customers,
    activeListId,
    stageFilter,
    tempFilter,
    assigneeFilter,
    ownerFilter,
    discountFilter,
    search,
  ]);

  const selectedCount = selected.size;
  const selectedArray = useMemo(() => Array.from(selected), [selected]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(filtered.map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function bulkUpdate(patch: {
    stage?: CrmStage | null;
    temperature?: Temperature | null;
    assignedToUserId?: string | null;
  }) {
    if (selectedArray.length === 0) return;
    await fetch("/api/admin/customers/bulk", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userIds: selectedArray, ...patch }),
    });
    startTransition(() => router.refresh());
  }

  async function rowUpdate(
    userId: string,
    patch: {
      stage?: CrmStage | null;
      temperature?: Temperature | null;
      assignedToUserId?: string | null;
      notes?: string | null;
    },
  ) {
    await fetch(`/api/admin/customers/${userId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    startTransition(() => router.refresh());
  }

  async function bulkAddToList(listId: string) {
    if (selectedArray.length === 0) return;
    await fetch(`/api/admin/lead-lists/${listId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userIds: selectedArray }),
    });
    setShowAddToList(false);
    clearSelection();
    startTransition(() => router.refresh());
  }

  async function bulkRemoveFromList(listId: string) {
    if (selectedArray.length === 0) return;
    await fetch(`/api/admin/lead-lists/${listId}/members`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userIds: selectedArray }),
    });
    clearSelection();
    startTransition(() => router.refresh());
  }

  async function deleteList(listId: string) {
    if (!confirm("Weet je zeker dat je deze lijst wilt verwijderen?")) return;
    await fetch(`/api/admin/lead-lists/${listId}`, { method: "DELETE" });
    setActiveListId("all");
    startTransition(() => router.refresh());
  }

  // Visible kolommen in juiste volgorde. Combineer built-in + custom keys.
  const visibleSet = useMemo(() => new Set(visible), [visible]);
  const orderedColumns = useMemo(() => {
    const known = new Set(order);
    const tail = allKeys.filter((c) => !known.has(c));
    return [...order, ...tail].filter((c) => visibleSet.has(c));
  }, [order, visibleSet, allKeys]);

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <>
      <AdminTopbar />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <CrmTabs active={activeTab} onChange={onTabChange} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            CRM
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Pipeline-management: lijsten, stages (lead → MQL → SQL → klant),
            temperatuur, account-manager toewijzing en overdracht naar
            sales/affiliate.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
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

        <div className="brand-card overflow-hidden p-0">
          {/* Tab-rij: Alle + lijsten + Nieuwe */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-[color:var(--border-soft)] px-3 py-2">
            <TabButton
              active={activeListId === "all"}
              onClick={() => setActiveListId("all")}
              label="Alle leads"
              count={customers.length}
            />
            {lists.map((l) => (
              <TabButton
                key={l.id}
                active={activeListId === l.id}
                onClick={() => setActiveListId(l.id)}
                label={l.name}
                count={l.memberCount}
                color={LIST_COLOR_BG[l.color]}
                onDelete={
                  l.ownerUserId === currentUserId
                    ? () => deleteList(l.id)
                    : undefined
                }
              />
            ))}
            {canCreateList && (
              <button
                onClick={() => setShowCreateList(true)}
                className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-[color:var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
              >
                <Plus className="size-3.5" strokeWidth={2.2} />
                Nieuwe lijst
              </button>
            )}
          </div>

          {activeList?.description && (
            <div className="border-b border-[color:var(--border-soft)] px-4 py-2 text-xs text-[color:var(--text-muted)]">
              {activeList.description}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--border-soft)] p-3">
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
                placeholder="Zoek naam / mail / code / notitie…"
                className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
                style={{ background: "var(--bg)" }}
              />
            </div>
            <FilterSelect
              value={stageFilter}
              onChange={setStageFilter}
              label="Alle stages"
              options={STAGE_OPTIONS.map((s) => ({
                value: s.key,
                label: s.label,
              }))}
            />
            <FilterSelect
              value={tempFilter}
              onChange={setTempFilter}
              label="Alle temperaturen"
              options={TEMP_OPTIONS.map((t) => ({
                value: t.key,
                label: t.label,
              }))}
            />
            <FilterSelect
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              label="Alle managers"
              specialNone="Niet toegewezen"
              options={adminUsers.map((u) => ({
                value: u.id,
                label: u.name,
              }))}
            />
            <FilterSelect
              value={ownerFilter}
              onChange={setOwnerFilter}
              label="Alle account owners"
              specialNone="Zonder owner"
              options={affiliates.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.code})`,
              }))}
            />
            <FilterSelect
              value={discountFilter}
              onChange={setDiscountFilter}
              label="Alle discount-codes"
              specialNone="Zonder code"
              options={discountCodes.map((d) => ({
                value: d.id,
                label: d.code,
              }))}
            />
            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-[color:var(--border-soft)] bg-white p-0.5">
                <button
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold",
                    viewMode === "table"
                      ? "bg-[color:var(--bg-deep)] text-[color:var(--navy)]"
                      : "text-[color:var(--text-muted)]",
                  )}
                >
                  <List className="size-3.5" strokeWidth={2.2} />
                  Tabel
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold",
                    viewMode === "kanban"
                      ? "bg-[color:var(--bg-deep)] text-[color:var(--navy)]"
                      : "text-[color:var(--text-muted)]",
                  )}
                >
                  <Kanban className="size-3.5" strokeWidth={2.2} />
                  Kanban
                </button>
              </div>
              <button
                onClick={() => setAddingInline(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--orange)] px-3 py-2 text-xs font-semibold text-white hover:bg-[color:var(--orange-600)]"
                title="Voeg een nieuwe prospect-rij toe (inline)"
              >
                <Plus className="size-3.5" strokeWidth={2.2} />
                Nieuwe rij
              </button>
              <button
                onClick={() => setShowCsvImport(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-3 py-2 text-xs font-semibold"
                style={{ background: "var(--bg)" }}
                title="CSV import met auto-lijst"
              >
                <FileSpreadsheet className="size-3.5" strokeWidth={2.2} />
                CSV import
              </button>
              <button
                onClick={() => setShowAddProspect(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-3 py-2 text-xs font-semibold"
                style={{ background: "var(--bg)" }}
                title="Uitgebreid prospect-form (volledige velden + lijsten)"
              >
                <UserPlus className="size-3.5" strokeWidth={2.2} />
                Volledig form
              </button>
              <button
                onClick={() => setShowColumnManager(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-3 py-2 text-xs font-semibold"
                style={{ background: "var(--bg)" }}
                title="Kolommen beheren"
              >
                <Columns3 className="size-3.5" strokeWidth={2.2} />
                Kolommen
              </button>
            </div>
          </div>

          {/* Bulk-toolbar */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--border-soft)] bg-[color:var(--bg)] px-4 py-3 text-sm">
              <span className="font-semibold">{selectedCount} geselecteerd</span>
              <InlineSelect
                placeholder="Set stage…"
                options={STAGE_OPTIONS.map((s) => ({
                  value: s.key,
                  label: s.label,
                }))}
                onChange={(v) => bulkUpdate({ stage: v as CrmStage })}
              />
              <InlineSelect
                placeholder="Set temperatuur…"
                options={TEMP_OPTIONS.map((t) => ({
                  value: t.key,
                  label: t.label,
                }))}
                onChange={(v) => bulkUpdate({ temperature: v as Temperature })}
              />
              <InlineSelect
                placeholder="Wijs toe aan…"
                options={[
                  { value: "__none__", label: "Niemand" },
                  ...adminUsers.map((u) => ({ value: u.id, label: u.name })),
                ]}
                onChange={(v) =>
                  bulkUpdate({
                    assignedToUserId: v === "__none__" ? null : v,
                  })
                }
              />
              <button
                onClick={() => setShowAddToList(true)}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Voeg toe aan lijst
              </button>
              {activeListId !== "all" && (
                <button
                  onClick={() => bulkRemoveFromList(activeListId)}
                  className="text-xs font-semibold text-red-700 hover:underline"
                >
                  Verwijder uit deze lijst
                </button>
              )}
              <button
                onClick={clearSelection}
                className="ml-auto text-xs font-semibold text-[color:var(--text-muted)] hover:underline"
              >
                Selectie wissen
              </button>
            </div>
          )}

          {/* Kanban-view */}
          {viewMode === "kanban" && (
            <KanbanView
              customers={filtered.map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                crmStage: c.crmStage,
                crmTemperature: c.crmTemperature,
                segment: c.segment,
                assignedToUserId: c.assignedToUserId,
                paidLicenseCount: c.paidLicenseCount,
                trialStatus: c.trialStatus,
                accountOwner: c.accountOwner
                  ? {
                      name: c.accountOwner.name,
                      code: c.accountOwner.code,
                    }
                  : null,
              }))}
              adminUsers={adminUsers}
              onStageChange={(userId, stage) =>
                rowUpdate(userId, { stage })
              }
            />
          )}

          {/* Tabel */}
          {viewMode === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[80rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr
                  className="text-[color:var(--text-muted)]"
                  style={{ background: "var(--bg)" }}
                >
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 &&
                        filtered.every((c) => selected.has(c.id))
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAllVisible() : clearSelection()
                      }
                      aria-label="Select all visible"
                    />
                  </th>
                  {orderedColumns.map((col) => {
                    const isCustom = col.startsWith("custom:");
                    const customDef = isCustom
                      ? customColumns.find((c) => c.key === col)
                      : null;
                    return (
                      <th
                        key={col}
                        className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                      >
                        {customDef
                          ? customDef.name
                          : COLUMN_LABELS[col as ColumnKey] ?? col}
                      </th>
                    );
                  })}
                  <th className="w-10 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {addingInline && (
                  <InlineProspectRow
                    adminUsers={adminUsers}
                    activeListId={activeListId}
                    onCancel={() => setAddingInline(false)}
                    onSaved={() => {
                      setAddingInline(false);
                      startTransition(() => router.refresh());
                    }}
                    colSpan={orderedColumns.length + 1}
                  />
                )}
                {filtered.length === 0 && !addingInline ? (
                  <tr>
                    <td
                      colSpan={orderedColumns.length + 2}
                      className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      Geen klanten in dit filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="bg-white"
                      style={{ borderTop: "1px solid var(--border-soft)" }}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleRow(r.id)}
                          aria-label={`Select ${r.email}`}
                        />
                      </td>
                      {orderedColumns.map((col) => (
                        <td key={col} className="px-3 py-3 align-top">
                          {col.startsWith("custom:") ? (
                            <CustomCell
                              colKey={col}
                              def={customColumns.find((c) => c.key === col)}
                              value={r.customFields?.[col] ?? null}
                              onChange={async (v) => {
                                await fetch(
                                  `/api/admin/customers/${r.id}/custom-field`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "content-type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      key: col,
                                      value: v,
                                    }),
                                  },
                                );
                                startTransition(() => router.refresh());
                              }}
                            />
                          ) : (
                            <CellRenderer
                              col={col as ColumnKey}
                              row={r}
                              adminUsers={adminUsers}
                              lists={lists}
                              onUpdate={(p) => rowUpdate(r.id, p)}
                              onOpenNotes={() => setNotesFor(r)}
                            />
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3 align-top">
                        <Link
                          href={`/admin/crm/${r.id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          )}

          <div className="border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
            1–{filtered.length} van {filtered.length}
            {activeList && ` in lijst "${activeList.name}"`}
          </div>
        </div>
      </div>

      {showCreateList && (
        <CreateListModal
          onClose={() => setShowCreateList(false)}
          onCreated={(newId) => {
            setShowCreateList(false);
            setActiveListId(newId);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {showColumnManager && (
        <ColumnManagerModal
          visible={visible}
          order={order}
          customColumns={customColumns}
          allKeys={allKeys}
          onChange={(v, o) => {
            setVisible(v);
            setOrder(o);
          }}
          onClose={() => setShowColumnManager(false)}
          onCustomChange={() => startTransition(() => router.refresh())}
        />
      )}

      {showAddProspect && (
        <AddProspectModal
          adminUsers={adminUsers}
          lists={lists.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
          onClose={() => setShowAddProspect(false)}
          onDone={() => {
            setShowAddProspect(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {showCsvImport && (
        <CsvImportModal
          adminUsers={adminUsers}
          onClose={() => setShowCsvImport(false)}
          onDone={(newListId) => {
            setShowCsvImport(false);
            if (newListId) setActiveListId(newListId);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {showAddToList && (
        <AddToListModal
          lists={lists}
          onClose={() => setShowAddToList(false)}
          onChoose={(listId) => bulkAddToList(listId)}
        />
      )}

      {notesFor && (
        <NotesModal
          customer={notesFor}
          onClose={() => setNotesFor(null)}
          onSave={async (notes) => {
            await rowUpdate(notesFor.id, { notes });
            setNotesFor(null);
          }}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  color,
  onDelete,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
        active
          ? "bg-[color:var(--bg-deep)] font-bold text-[color:var(--navy)]"
          : "font-medium text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
      )}
    >
      <button onClick={onClick} className="inline-flex items-center gap-2">
        {color && (
          <span
            className="size-2 rounded-full"
            style={{ background: color }}
          />
        )}
        {label}
        <span className="rounded-full bg-white/60 px-1.5 text-[0.625rem] font-semibold">
          {count}
        </span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-[color:var(--text-soft)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-700"
          title="Lijst verwijderen"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  specialNone,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  specialNone?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[color:var(--border-soft)] py-2 px-3 text-sm outline-none"
      style={{ background: "var(--bg)" }}
    >
      <option value="all">{label}</option>
      {specialNone && <option value="none">{specialNone}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function InlineSelect({
  placeholder,
  options,
  onChange,
}: {
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      defaultValue=""
      onChange={(e) => {
        if (!e.target.value) return;
        onChange(e.target.value);
        e.target.value = "";
      }}
      className="rounded-lg border border-[color:var(--border-soft)] py-1.5 px-2 text-xs"
      style={{ background: "var(--bg)" }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function StageChip({
  value,
  onChange,
}: {
  value: CrmStage;
  onChange: (next: CrmStage) => void;
}) {
  const meta = STAGE_OPTIONS.find((s) => s.key === value)!;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CrmStage)}
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold outline-none cursor-pointer",
        meta.chip,
      )}
    >
      {STAGE_OPTIONS.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

function TempChip({
  value,
  onChange,
}: {
  value: Temperature;
  onChange: (next: Temperature) => void;
}) {
  const meta = TEMP_OPTIONS.find((t) => t.key === value)!;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Temperature)}
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.625rem] font-semibold outline-none cursor-pointer",
        meta.chip,
      )}
    >
      {TEMP_OPTIONS.map((t) => (
        <option key={t.key} value={t.key}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

function CustomCell({
  colKey,
  def,
  value,
  onChange,
}: {
  colKey: string;
  def: CustomColumnDef | undefined;
  value: string | number | null;
  onChange: (v: string | number | null) => void | Promise<void>;
}) {
  const [local, setLocal] = useState<string>(
    value === null || value === undefined ? "" : String(value),
  );
  const [editing, setEditing] = useState(false);

  if (!def) return <span className="text-[color:var(--text-soft)]">—</span>;

  async function commit() {
    setEditing(false);
    const trimmed = local.trim();
    if (trimmed === (value === null ? "" : String(value))) return;
    if (def!.type === "number") {
      const n = Number(trimmed);
      await onChange(isFinite(n) && trimmed ? n : null);
    } else {
      await onChange(trimmed ? trimmed : null);
    }
  }

  if (def.type === "select") {
    return (
      <select
        value={value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
      >
        <option value="">—</option>
        {(def.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setLocal(value === null ? "" : String(value));
            setEditing(false);
          }
        }}
        className="w-full rounded-md border border-[color:var(--orange)] bg-white px-2 py-1 text-xs"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="rounded px-1 text-left text-xs hover:bg-[color:var(--bg)]"
    >
      {value === null || value === "" ? (
        <span className="text-[color:var(--text-soft)]">—</span>
      ) : def.type === "date" ? (
        new Date(value as string).toLocaleDateString("nl-NL")
      ) : (
        String(value)
      )}
    </button>
  );
}

function CellRenderer({
  col,
  row,
  adminUsers,
  lists,
  onUpdate,
  onOpenNotes,
}: {
  col: ColumnKey;
  row: Customer;
  adminUsers: AdminUser[];
  lists: LeadListOption[];
  onUpdate: (p: {
    stage?: CrmStage;
    temperature?: Temperature;
    assignedToUserId?: string | null;
    notes?: string | null;
  }) => void;
  onOpenNotes: () => void;
}) {
  switch (col) {
    case "customer":
      return (
        <Link
          href={`/admin/crm/${row.id}`}
          className="flex items-center gap-3"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--bg-deep)" }}
          >
            {row.role === "admin" ? (
              <Building2
                className="size-4"
                strokeWidth={1.8}
                style={{ color: "var(--navy)" }}
              />
            ) : (
              <User
                className="size-4"
                strokeWidth={1.8}
                style={{ color: "var(--navy)" }}
              />
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{row.name}</div>
            <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
              {row.email}
              {!row.emailVerified && " · niet geverifieerd"}
            </div>
          </div>
        </Link>
      );
    case "stage":
      return (
        <StageChip
          value={row.crmStage}
          onChange={(v) => onUpdate({ stage: v })}
        />
      );
    case "temperature":
      return (
        <TempChip
          value={row.crmTemperature}
          onChange={(v) => onUpdate({ temperature: v })}
        />
      );
    case "assignee":
      return (
        <select
          value={row.assignedToUserId ?? ""}
          onChange={(e) =>
            onUpdate({ assignedToUserId: e.target.value || null })
          }
          className="rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
        >
          <option value="">— Niet toegewezen</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      );
    case "segment": {
      const seg = SEGMENT_META[row.segment];
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold"
          style={{ background: seg.chipBg, color: seg.chipFg }}
        >
          {seg.label}
        </span>
      );
    }
    case "trial":
      return row.trialStartedAt ? (
        <div className="text-xs text-[color:var(--text-muted)]">
          <div>start {formatDate(row.trialStartedAt)}</div>
          {row.trialExpiresAt && (
            <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
              loopt tot {formatDate(row.trialExpiresAt)}
            </div>
          )}
        </div>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "mollie":
      return row.mollieCustomerId ? (
        <div className="font-mono text-[0.6875rem] text-[color:var(--text-muted)]">
          <div className="truncate" style={{ maxWidth: 110 }}>
            {row.mollieCustomerId}
          </div>
          {row.subscriptionStatus && (
            <div className="text-[0.625rem] text-[color:var(--text-soft)]">
              sub {row.subscriptionStatus}
            </div>
          )}
        </div>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "discount": {
      const label = formatDiscount(row.discountType, row.discountValue);
      return (
        <div className="text-xs">
          {label && (
            <div className="font-semibold text-[color:var(--orange-600)]">
              {label}
            </div>
          )}
          <div className="text-[0.6875rem] text-[color:var(--text-soft)]">
            {row.licenseSource ?? "—"}
          </div>
        </div>
      );
    }
    case "mails":
      return (
        <div className="text-xs">
          <div className="font-semibold">{row.emailsSent} verstuurd</div>
          <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
            {row.emailsOpened} geopend · {row.emailsClicked} geklikt
          </div>
        </div>
      );
    case "licenses":
      return (
        <span className="font-mono text-xs text-[color:var(--text-muted)]">
          {row.paidLicenseCount}
        </span>
      );
    case "memberSince":
      return (
        <span className="text-xs text-[color:var(--text-muted)]">
          {formatDate(row.createdAt)}
        </span>
      );
    case "accountOwner":
      return row.accountOwner ? (
        <Link
          href={`/admin/affiliates/${row.accountOwner.affiliateId}`}
          className="inline-flex flex-col text-xs"
        >
          <span className="font-semibold text-[color:var(--navy)]">
            {row.accountOwner.name}
          </span>
          <span className="font-mono text-[0.625rem] text-[color:var(--text-soft)]">
            {row.accountOwner.code}
          </span>
        </Link>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "discountCode":
      return row.discountCodeUsed ? (
        row.discountCodeUsed.affiliateId ? (
          <Link
            href={`/admin/affiliates/${row.discountCodeUsed.affiliateId}`}
            className="font-mono text-xs font-semibold text-[color:var(--navy)] hover:underline"
          >
            {row.discountCodeUsed.code}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold">
            {row.discountCodeUsed.code}
          </span>
        )
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "lists":
      return (
        <div className="flex flex-wrap gap-1">
          {row.listIds.map((id) => {
            const l = lists.find((x) => x.id === id);
            if (!l) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold text-white"
                style={{ background: LIST_COLOR_BG[l.color] }}
              >
                {l.name}
              </span>
            );
          })}
          <button
            onClick={onOpenNotes}
            className="text-[0.625rem] font-semibold text-[color:var(--text-muted)] hover:underline"
            title="Notitie"
          >
            {row.notes ? "📝" : "+"}
          </button>
        </div>
      );
    default:
      return null;
  }
}

function CreateListModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [isShared, setIsShared] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const COLORS = ["blue", "green", "orange", "red", "purple", "navy", "aqua", "gray"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/lead-lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description, color, isShared }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Aanmaken mislukt.");
      setSubmitting(false);
      return;
    }
    onCreated(data.list.id);
  }

  return (
    <Modal onClose={onClose} title="Nieuwe leadlijst">
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-xs font-semibold">Naam</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="bv. Outbound NL-juristen Q3"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold">Beschrijving</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input min-h-[60px]"
            placeholder="Doel, ICP, eigenaar — voor team-context"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold">Kleur</span>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "size-7 rounded-full border-2",
                  color === c
                    ? "border-[color:var(--navy)]"
                    : "border-transparent",
                )}
                style={{ background: LIST_COLOR_BG[c] }}
                aria-label={c}
              />
            ))}
          </div>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
          />
          Gedeeld met team
        </label>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Annuleer
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary disabled:opacity-50"
          >
            {submitting ? "Aanmaken…" : "Lijst aanmaken"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ColumnManagerModal({
  visible,
  order,
  customColumns,
  allKeys,
  onChange,
  onClose,
  onCustomChange,
}: {
  visible: string[];
  order: string[];
  customColumns: CustomColumnDef[];
  allKeys: string[];
  onChange: (visible: string[], order: string[]) => void;
  onClose: () => void;
  onCustomChange: () => void;
}) {
  const [localOrder, setLocalOrder] = useState<string[]>(() => {
    const known = new Set(order);
    const tail = allKeys.filter((c) => !known.has(c));
    return [...order, ...tail];
  });
  const [localVisible, setLocalVisible] = useState<Set<string>>(
    new Set(visible),
  );
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);

  function toggle(col: string) {
    const next = new Set(localVisible);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    setLocalVisible(next);
  }

  function onDragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    if (!dragKey) return;
    const fromIdx = localOrder.indexOf(dragKey);
    if (fromIdx === -1 || fromIdx === idx) return;
    const next = [...localOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(idx, 0, moved);
    setLocalOrder(next);
  }

  function apply() {
    onChange(
      localOrder.filter((c) => localVisible.has(c)),
      localOrder,
    );
    onClose();
  }

  async function deleteCustomColumn(id: string) {
    if (!confirm("Verwijder deze custom kolom? Waarden in bestaande klanten blijven bewaard in custom_fields.")) return;
    await fetch(`/api/admin/crm/custom-columns/${id}`, {
      method: "DELETE",
    });
    onCustomChange();
  }

  function getLabel(key: string): string {
    if (key.startsWith("custom:")) {
      const cc = customColumns.find((c) => c.key === key);
      return cc?.name ?? key;
    }
    return COLUMN_LABELS[key as ColumnKey] ?? key;
  }

  return (
    <Modal onClose={onClose} title="Kolommen beheren">
      <p className="mb-3 text-xs text-[color:var(--text-muted)]">
        Toggle zichtbaarheid met het oog. Sleep een rij om de volgorde te
        wijzigen. Auto-save naar je profiel.
      </p>
      <button
        type="button"
        onClick={() => setShowAddCustom(true)}
        className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[color:var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
      >
        <Plus className="size-3.5" strokeWidth={2.2} />
        Custom kolom toevoegen
      </button>
      <ul className="divide-y divide-[color:var(--border-soft)] rounded-xl border border-[color:var(--border-soft)]">
        {localOrder.map((col, idx) => {
          const isVisible = localVisible.has(col);
          const isCustom = col.startsWith("custom:");
          const customDef = isCustom
            ? customColumns.find((c) => c.key === col)
            : null;
          return (
            <li
              key={col}
              draggable
              onDragStart={() => setDragKey(col)}
              onDragEnd={() => setDragKey(null)}
              onDragOver={(e) => onDragOver(idx, e)}
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-2 cursor-grab",
                dragKey === col && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2">
                <GripVertical
                  className="size-4 text-[color:var(--text-soft)]"
                  strokeWidth={2.2}
                />
                <button
                  onClick={() => toggle(col)}
                  className="text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
                  aria-label={isVisible ? "Verberg" : "Toon"}
                >
                  {isVisible ? (
                    <Eye className="size-4" strokeWidth={2.2} />
                  ) : (
                    <EyeOff className="size-4" strokeWidth={2.2} />
                  )}
                </button>
                <span className="text-sm font-medium">{getLabel(col)}</span>
                {isCustom && (
                  <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-purple-800">
                    custom
                  </span>
                )}
                {customDef && (
                  <span className="text-[0.6rem] text-[color:var(--text-soft)]">
                    {customDef.type}
                  </span>
                )}
              </div>
              {customDef && (
                <button
                  onClick={() => deleteCustomColumn(customDef.id)}
                  className="text-[color:var(--text-soft)] hover:text-red-700"
                  title="Verwijder custom kolom"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-secondary">
          Annuleer
        </button>
        <button onClick={apply} className="btn btn-primary">
          Toepassen
        </button>
      </div>

      {showAddCustom && (
        <AddCustomColumnInlineModal
          onClose={() => setShowAddCustom(false)}
          onCreated={() => {
            setShowAddCustom(false);
            onCustomChange();
          }}
        />
      )}
    </Modal>
  );
}

function AddCustomColumnInlineModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "number" | "date" | "select">(
    "text",
  );
  const [optionsText, setOptionsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const options =
      type === "select"
        ? optionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null;
    const res = await fetch("/api/admin/crm/custom-columns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, type, options }),
    });
    const data = await res.json();
    if (!data.success) {
      setError(data.error ?? "Aanmaken mislukt.");
      setSubmitting(false);
      return;
    }
    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-[color:var(--bg)]"
          aria-label="Sluiten"
        >
          <X className="size-4" />
        </button>
        <h3 className="text-lg font-bold">Custom kolom toevoegen</h3>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold">Naam</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="bv. Industrie"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold">Type</span>
            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as "text" | "number" | "date" | "select",
                )
              }
              className="input"
            >
              <option value="text">Tekst</option>
              <option value="number">Getal</option>
              <option value="date">Datum</option>
              <option value="select">Keuze-lijst</option>
            </select>
          </label>
          {type === "select" && (
            <label className="grid gap-1">
              <span className="text-xs font-semibold">
                Opties (komma-gescheiden)
              </span>
              <input
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                className="input"
                placeholder="Tech, Finance, Legal, Health"
              />
            </label>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Annuleer
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary disabled:opacity-50"
            >
              {submitting ? "Aanmaken…" : "Aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddToListModal({
  lists,
  onClose,
  onChoose,
}: {
  lists: LeadListOption[];
  onClose: () => void;
  onChoose: (listId: string) => void;
}) {
  return (
    <Modal onClose={onClose} title="Voeg toe aan lijst">
      {lists.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">
          Geen lijsten beschikbaar. Maak eerst een lijst aan.
        </p>
      ) : (
        <ul className="grid gap-2">
          {lists.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => onChoose(l.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-[color:var(--border-soft)] p-3 text-left hover:bg-[color:var(--bg)]"
              >
                <span
                  className="size-4 rounded-full"
                  style={{ background: LIST_COLOR_BG[l.color] }}
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{l.name}</div>
                  {l.description && (
                    <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                      {l.description}
                    </div>
                  )}
                </div>
                <span className="text-[0.6875rem] text-[color:var(--text-soft)]">
                  {l.memberCount} leads
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function NotesModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (notes: string | null) => void | Promise<void>;
}) {
  const [notes, setNotes] = useState(customer.notes ?? "");

  return (
    <Modal onClose={onClose} title={`Notitie: ${customer.name}`}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="input min-h-[150px] w-full"
        placeholder="Sales-context, gesprekken, follow-up reminders…"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-secondary">
          Annuleer
        </button>
        <button
          onClick={() => onSave(notes || null)}
          className="btn btn-primary"
        >
          Opslaan
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-[color:var(--bg)]"
          aria-label="Sluiten"
        >
          <X className="size-4" />
        </button>
        <h2 className="mb-4 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
