"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Building2,
  Columns3,
  Expand,
  Eye,
  ChevronDown,
  EyeOff,
  FileSpreadsheet,
  GripVertical,
  Hash,
  Kanban,
  Link2,
  List,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Type as TypeIcon,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { CrmTabs, type CrmTabKey } from "./crm-tabs";
import {
  SupportActions,
  type SupportSnapshot,
} from "./[userId]/support-actions";
import { OrgSidePanel } from "./organizations/org-side-panel";
import { FunnelCockpit } from "./organizations/funnel-cockpit";
import { BrandIdentityBlock } from "./brand-identity-block";
import { EntitySidePanel } from "./entity-side-panel";
import { AccountSignalsBlock } from "./account-signals-block";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  COLUMN_LABELS,
  COLUMN_WIDTH_DEFAULTS,
  COLUMN_MIN_WIDTH,
  COLUMN_MAX_WIDTH,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_VISIBLE_COLUMNS,
  COLUMN_PRESETS,
  BELRONDE_WIDTHS,
  type ColumnPresetKey,
  type ColumnKey,
  type ColumnPrefs,
} from "@/lib/services/columnPrefsShared";
import {
  dispositionsByGroup,
  dispositionLabel,
  DISPOSITION_BY_KEY,
} from "@/lib/services/crmCallDisposition";
import { MKB_BRANCHES } from "@/lib/services/mkbBranches";
import { KanbanView } from "./kanban-view";
import { AddProspectModal } from "./add-prospect-modal";
import { CsvImportModal } from "./csv-import-modal";
import { InlineProspectRow } from "./inline-prospect-row";
import { LeadListCampaignSheet } from "./lead-list-campaign-sheet";

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
  | "churned"
  | "reseller";

type Temperature = "cold" | "lukewarm" | "warm" | "hot";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  mobilePhone: string | null;
  roleAtCompany: string | null;
  orgKvk: string | null;
  orgVatNumber: string | null;
  orgBrancheVereniging: string | null;
  orgAantalVestigingen: number | null;
  orgHoofdkantoor: string | null;
  orgSpecialisatie: string | null;
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
  /** Funnel-spoor (migratie 0052): eindklant- vs reseller-werving. */
  prospectType: "eindklant" | "reseller";
  /** Afgeleide reseller-funnel-kolom (deck-timestamps). Alleen bij reseller. */
  resellerStage: string;
  crmTemperature: Temperature;
  assignedToUserId: string | null;
  notes: string | null;
  customFields: Record<string, string | number | null> | null;
  listIds: string[];
  // Polymorf: "customer" = auth.user (login), "prospect" = crm_contact (GTM,
  // geen login). organizationId is gevuld voor prospects (stage/temp leven
  // op de organisatie). Default "customer" als niet meegegeven.
  kind?: "customer" | "prospect";
  // True zodra er een account (auth.user) achter dit contact zit: een prospect
  // die zelf een trial/login aanmaakte. Beheer van het account zit in /admin/users.
  hasAccount?: boolean;
  company?: string | null;
  organizationId?: string | null;
  enrichment?: ProspectEnrichmentClient | null;
  // Call-center (org-niveau, alleen prospects).
  lastDisposition?: string | null;
  lastDispositionAt?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  doNotCall?: boolean;
  wrongNumber?: boolean;
};

// Clay-aligned GTM-verrijking (alleen prospects). Client-spiegel van
// ProspectEnrichment in services/crmContactEnrichment.ts.
type ProspectEnrichmentClient = {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  seniority: string | null;
  department: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  city: string | null;
  country: string | null;
  emailStatus: string | null;
  companyName: string | null;
  companyDomain: string | null;
  companyLinkedinUrl: string | null;
  niche: string | null;
  industry: string | null;
  companySizeRange: string | null;
  employeeCount: number | null;
  revenueRange: string | null;
  foundedYear: number | null;
  followersLinkedin: number | null;
  followersInstagram: number | null;
  followersFacebook: number | null;
  followersYoutube: number | null;
  followersSubstack: number | null;
  followersOwn: number | null;
  totalReach: number | null;
  leadScore: number | null;
  lastContactAt: string | null;
  lastChannel: string | null;
  touchCount: number;
  enrichmentSource: string | null;
  enrichedAt: string | null;
};

// People-stage (customerStage) → org-pipeline-status. Spiegelt
// ORG_STATUS_TO_STAGE in services/prospect.ts zodat een prospect-edit in
// de Personen-tab de juiste org-status zet.
// Velden die direct op crm_contacts leven (contacts-PATCH); de rest van de
// inline-edits loopt via de enrichment-route.
const CONTACT_PATCH_FIELDS = new Set([
  "name",
  "firstName",
  "lastName",
  "mobilePhone",
  "roleAtCompany",
]);

// Kolom-key → crm_organizations-veld (org-PATCH, zoals stage).
const ORG_PATCH_FIELDS: Record<string, string> = {
  orgKvk: "kvk",
  orgVatNumber: "vatNumber",
  orgBrancheVereniging: "brancheVereniging",
  orgAantalVestigingen: "aantalVestigingen",
  orgHoofdkantoor: "hoofdkantoor",
  orgSpecialisatie: "specialisatie",
};

const STAGE_TO_ORG_STATUS: Record<CrmStage, string> = {
  lead: "lead",
  prospect: "contacted",
  mql: "qualified",
  sql: "qualified",
  customer: "won",
  lost: "lost",
  churned: "lost",
  reseller: "reseller",
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
    key: "reseller",
    label: "Reseller",
    chip: "bg-teal-100 text-teal-800",
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

// Kleur-tint per Resend-mailstatus voor de E-mail-tab chip.
function emailStatusTone(status: string): { background: string; color: string } {
  switch (status) {
    case "delivered":
    case "opened":
    case "clicked":
      return {
        background: "color-mix(in srgb, var(--green) 14%, white)",
        color: "var(--green)",
      };
    case "bounced":
    case "failed":
    case "complained":
      return {
        background: "color-mix(in srgb, var(--red) 14%, white)",
        color: "var(--red)",
      };
    default:
      return { background: "var(--surface-2)", color: "var(--text-muted)" };
  }
}

type PeopleCursor = { createdAt: string; id: string };

export function CrmView({
  currentUserId,
  isAdmin,
  canCreateList,
  customers,
  initialNextCursor,
  totalPeople,
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
  isAdmin: boolean;
  canCreateList: boolean;
  customers: Customer[];
  initialNextCursor: PeopleCursor | null;
  totalPeople: number;
  affiliates: AffiliateOption[];
  discountCodes: DiscountOption[];
  lists: LeadListOption[];
  adminUsers: AdminUser[];
  columnPrefs: ColumnPrefs;
  customColumns: CustomColumnDef[];
  stageCounts: Record<Stage, number>;
  kpis: Kpi[];
  activeTab: CrmTabKey;
  onTabChange: (k: CrmTabKey) => void;
}) {
  const [activeListId, setActiveListId] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  // Funnel-spoor van het bord (migratie 0052): eindklant- vs reseller-werving.
  const [funnel, setFunnel] = useState<"eindklant" | "reseller">("eindklant");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tempFilter, setTempFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [discountFilter, setDiscountFilter] = useState<string>("all");
  // GTM-targeting op prospect-verrijking (server-side).
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [minScoreFilter, setMinScoreFilter] = useState<string>("");
  // Call-center: filter op laatste dispositie ("Actie") + verberg-verloren.
  // Verloren (lost/churned) is default verborgen: een belronde wil geen
  // afgewezen prospects in beeld. Stage-filter op Verloren/Churned wint.
  const [dispositionFilter, setDispositionFilter] = useState<string>("all");
  const [hideLost, setHideLost] = useState(true);
  const effectiveHideLost =
    hideLost && stageFilter !== "lost" && stageFilter !== "churned";
  // Secundaire filters (owner/discount/branche/grootte/score) ingeklapt zodat
  // de belronde-toolbar op een laptop één regel blijft.
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const extraFilterCount =
    (ownerFilter !== "all" ? 1 : 0) +
    (discountFilter !== "all" ? 1 : 0) +
    (industryFilter ? 1 : 0) +
    (sizeFilter !== "all" ? 1 : 0) +
    (minScoreFilter ? 1 : 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [addingInline, setAddingInline] = useState(false);
  const [notesFor, setNotesFor] = useState<Customer | null>(null);
  const [enrichFor, setEnrichFor] = useState<Customer | null>(null);
  const [personFor, setPersonFor] = useState<Customer | null>(null);
  // Altijd-zichtbaar org-side-panel rechts: de organisatie van het geselecteerde
  // prospect-contact. Zo kan de AM direct notuleren + data inzien.
  const [dockedOrgId, setDockedOrgId] = useState<string | null>(null);

  // Server-side gepagineerde rijen. `customers` is alleen de eerste pagina;
  // filter-wissels + "meer laden" halen volgende pagina's via de API, zodat
  // er nooit meer dan één pagina (≤ limit) in de browser zit.
  const [rows, setRows] = useState<Customer[]>(customers);
  const [cursor, setCursor] = useState<PeopleCursor | null>(initialNextCursor);
  const [total, setTotal] = useState(totalPeople);
  const [loadingPage, setLoadingPage] = useState(false);
  const firstRender = useRef(true);

  async function fetchPeople(reset: boolean) {
    setLoadingPage(true);
    const p = new URLSearchParams();
    if (stageFilter !== "all") p.set("stage", stageFilter);
    if (tempFilter !== "all") p.set("temperature", tempFilter);
    if (assigneeFilter !== "all") p.set("assignee", assigneeFilter);
    if (activeListId !== "all") p.set("listId", activeListId);
    if (search.trim()) p.set("search", search.trim());
    if (industryFilter.trim()) p.set("industry", industryFilter.trim());
    if (sizeFilter !== "all") p.set("size", sizeFilter);
    if (minScoreFilter.trim()) p.set("minScore", minScoreFilter.trim());
    if (dispositionFilter !== "all") p.set("disposition", dispositionFilter);
    if (effectiveHideLost) p.set("excludeLost", "1");
    if (!reset && cursor) {
      p.set("cursorCreatedAt", cursor.createdAt);
      p.set("cursorId", cursor.id);
    }
    try {
      const res = await fetch(`/api/admin/crm/people?${p.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRows((prev) => (reset ? data.rows : [...prev, ...data.rows]));
        setCursor(data.nextCursor);
        setTotal(data.total);
      }
    } finally {
      setLoadingPage(false);
    }
  }

  // Re-fetch eerste pagina bij elke server-filter-wissel (search gedebounced).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      void fetchPeople(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stageFilter,
    tempFilter,
    assigneeFilter,
    activeListId,
    search,
    industryFilter,
    sizeFilter,
    minScoreFilter,
    dispositionFilter,
    effectiveHideLost,
  ]);

  // Na een mutatie: herlaad de huidige gefilterde eerste pagina.
  function refresh() {
    void fetchPeople(true);
  }

  // Live-refresh: een nieuwe of aangepaste prospect/contact verschijnt bij
  // alle account managers zonder handmatig verversen. Polling (elke 15s) +
  // direct bij terugkeer naar het tabblad. Geen websockets nodig — Vercel is
  // serverless; voor een gedeelde CRM met een handvol AM's is dit ruim live
  // genoeg en zonder extra infra. We slaan de poll over terwijl iemand in een
  // invoerveld typt (inline-edit/zoeken) of er al een laadactie loopt.
  const fetchPeopleRef = useRef(fetchPeople);
  fetchPeopleRef.current = fetchPeople;
  const loadingPageRef = useRef(loadingPage);
  loadingPageRef.current = loadingPage;
  useEffect(() => {
    function maybeRefresh() {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      if (loadingPageRef.current) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      void fetchPeopleRef.current(true);
    }
    const id = setInterval(maybeRefresh, 15000);
    window.addEventListener("focus", maybeRefresh);
    document.addEventListener("visibilitychange", maybeRefresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", maybeRefresh);
      document.removeEventListener("visibilitychange", maybeRefresh);
    };
  }, []);

  // Visible/order werken nu met (built-in + custom) ColumnKey-strings.
  // Custom-column keys hebben prefix "custom:" (zie services/customColumns.ts).
  const allKeys = useMemo<string[]>(
    () => [
      ...(Object.keys(COLUMN_LABELS) as string[]),
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
  // Per-kolom breedte (px). Excel/Clay-stijl resize; default per kolom.
  const [widths, setWidths] = useState<Record<string, number>>(
    columnPrefs.columnWidths ?? {},
  );

  /** Effectieve breedte van een kolom: user-override → belronde-default (als
   *  de zichtbare set de belronde is, zodat de bel-weergave ook zonder
   *  opgeslagen prefs zonder scroll past) → default-map → fallback. */
  function colWidth(key: string): number {
    return (
      widths[key] ??
      (activePreset === "belronde"
        ? BELRONDE_WIDTHS[key as ColumnKey]
        : undefined) ??
      COLUMN_WIDTH_DEFAULTS[key] ??
      DEFAULT_COLUMN_WIDTH
    );
  }

  // Persistier prefs bij wijziging (debounced via 500ms). De eerste run wordt
  // overgeslagen: bij mount is de state gelijk aan de server-prefs, en een
  // write-per-pageview zou in een tweede tab opgeslagen wijzigingen
  // terugdraaien (last-write-wins zonder merge).
  const prefsDirtyRef = useRef(false);
  useEffect(() => {
    if (!prefsDirtyRef.current) {
      prefsDirtyRef.current = true;
      return;
    }
    const t = setTimeout(() => {
      void fetch("/api/admin/crm/column-prefs", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visibleColumns: visible,
          columnOrder: order,
          columnWidths: widths,
        }),
      });
    }, 500);
    return () => clearTimeout(t);
  }, [visible, order, widths]);

  // View-preset: zet zichtbare kolommen + volgorde in één klik. Persistentie
  // loopt via de bestaande debounced prefs-effect hierboven. Custom-kolommen
  // ("custom:…") staan buiten de presets: ze blijven staan bij een preset-klik
  // en tellen niet mee in de actief-detectie. Preset-breedtes worden bewust
  // NIET in de user-widths gemerged — colWidth past ze als render-fallback toe
  // zolang de preset actief is, zodat eigen resizes nooit overschreven raken.
  const activePreset = useMemo<ColumnPresetKey | null>(() => {
    const current = visible
      .filter((c) => !c.startsWith("custom:"))
      .sort()
      .join(",");
    for (const key of Object.keys(COLUMN_PRESETS) as ColumnPresetKey[]) {
      const cols = [...COLUMN_PRESETS[key].columns].sort().join(",");
      if (cols === current) return key;
    }
    return null;
  }, [visible]);

  function applyPreset(key: ColumnPresetKey) {
    const preset = COLUMN_PRESETS[key];
    const cols = preset.columns as string[];
    setVisible((prev) => [...cols, ...prev.filter((c) => c.startsWith("custom:"))]);
    setOrder((prev) => [...cols, ...prev.filter((c) => !cols.includes(c))]);
  }

  // Kolom-herordening: sleep een header naar links/rechts (HTML5 dnd, zelfde
  // patroon als de kolom-manager). Persistentie via de bestaande order-prefs.
  const dragColRef = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  function moveColumn(src: string, target: string) {
    if (src === target) return;
    setOrder((prev) => {
      const known = new Set(prev);
      const full = [...prev, ...allKeys.filter((c) => !known.has(c))];
      const without = full.filter((c) => c !== src);
      const idx = without.indexOf(target);
      if (idx === -1) return prev;
      without.splice(idx, 0, src);
      return without;
    });
  }

  // Kolom-resize: drag op de rechterrand van een header. Pointer-events zodat
  // het ook buiten de cel doorloopt. Klemt tussen min/max.
  const resizeRef = useRef<{ key: string; startX: number; startW: number } | null>(
    null,
  );
  function startResize(key: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { key, startX: e.clientX, startW: colWidth(key) };
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", onResizeEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }
  function onResizeMove(e: PointerEvent) {
    const r = resizeRef.current;
    if (!r) return;
    const next = Math.min(
      COLUMN_MAX_WIDTH,
      Math.max(COLUMN_MIN_WIDTH, r.startW + (e.clientX - r.startX)),
    );
    setWidths((w) => ({ ...w, [r.key]: next }));
  }
  function onResizeEnd() {
    resizeRef.current = null;
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", onResizeEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  // Customers gefilterd op de tab + alle filters.
  const filtered = useMemo(() => {
    const inList =
      activeListId === "all"
        ? null
        : new Set(
            rows
              .filter((c) => c.listIds.includes(activeListId))
              .map((c) => c.id),
          );
    return rows.filter((r) => {
      if (inList && !inList.has(r.id)) return false;
      if (stageFilter !== "all" && r.crmStage !== stageFilter) return false;
      if (
        effectiveHideLost &&
        (r.crmStage === "lost" || r.crmStage === "churned")
      )
        return false;
      if (dispositionFilter !== "all") {
        if (dispositionFilter === "none") {
          if (r.lastDisposition) return false;
        } else if (r.lastDisposition !== dispositionFilter) return false;
      }
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
    rows,
    activeListId,
    stageFilter,
    tempFilter,
    assigneeFilter,
    ownerFilter,
    discountFilter,
    search,
    dispositionFilter,
    effectiveHideLost,
  ]);

  const selectedCount = selected.size;
  const selectedArray = useMemo(() => Array.from(selected), [selected]);
  const rowsById = useMemo(
    () => new Map(rows.map((c) => [c.id, c])),
    [rows],
  );

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

  // Clay-stijl "expand record": opent het persoon-side-panel voor déze rij.
  // Zowel klant (auth.user) als prospect (crm_contact) openen hetzelfde panel;
  // de reseller-funnel zit erin als Partner-tab. De gekoppelde organisatie
  // bereik je via de spring-link in de kop. Wordt aangeroepen door het
  // Expand-icoon links in de checkbox-kolom (op hover) én de pijl-knop in de
  // actie-kolom.
  function openRecord(r: Customer) {
    // Toggle: zelfde rij nog eens = panel dicht.
    setPersonFor((cur) => (cur?.id === r.id ? null : r));
  }

  async function bulkUpdate(patch: {
    stage?: CrmStage | null;
    temperature?: Temperature | null;
    assignedToUserId?: string | null;
    prospectType?: "eindklant" | "reseller";
  }) {
    // Klant-rijen (auth.user-ids) via het customer-bulk-endpoint.
    const userIds = selectedArray.filter(
      (id) => rowsById.get(id)?.kind !== "prospect",
    );
    // Prospect-rijen (crm_contacts) → bulk-toewijzing via het contacts-endpoint
    // (zet crm_contacts.assigned_to_user_id; drijft de personen-scope).
    const prospectIds = selectedArray.filter(
      (id) => rowsById.get(id)?.kind === "prospect",
    );

    const calls: Promise<unknown>[] = [];
    if (userIds.length > 0) {
      calls.push(
        fetch("/api/admin/customers/bulk", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userIds, ...patch }),
        }),
      );
    }
    if (prospectIds.length > 0 && patch.assignedToUserId !== undefined) {
      calls.push(
        fetch("/api/admin/crm/contacts/assign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contactIds: prospectIds,
            assignToUserId: patch.assignedToUserId,
          }),
        }),
      );
    }
    // Funnel-spoor geldt alleen voor prospects (klanten zijn altijd eindklant).
    if (prospectIds.length > 0 && patch.prospectType !== undefined) {
      calls.push(
        fetch("/api/admin/crm/contacts/prospect-type", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contactIds: prospectIds,
            prospectType: patch.prospectType,
          }),
        }),
      );
    }
    if (calls.length === 0) return;
    await Promise.all(calls);
    refresh();
  }

  async function rowDisposition(
    orgId: string,
    dispositionKey: string,
    dueAt?: string | null,
  ) {
    await fetch(`/api/admin/crm/organizations/${orgId}/disposition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dispositionKey, dueAt: dueAt ?? null }),
    });
    refresh();
  }

  async function rowUpdate(
    id: string,
    patch: {
      stage?: CrmStage | null;
      temperature?: Temperature | null;
      assignedToUserId?: string | null;
      notes?: string | null;
    },
  ) {
    const row = rowsById.get(id);
    if (row?.kind === "prospect") {
      // Prospect: notes leven op het contact, stage/temp/owner op de org.
      if (patch.notes !== undefined) {
        await fetch(`/api/admin/crm/contacts/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notes: patch.notes }),
        });
      }
      const orgPatch: Record<string, unknown> = {};
      if (patch.stage !== undefined && patch.stage !== null)
        orgPatch.status = STAGE_TO_ORG_STATUS[patch.stage];
      if (patch.temperature !== undefined)
        orgPatch.temperature = patch.temperature;
      if (patch.assignedToUserId !== undefined)
        orgPatch.accountOwnerId = patch.assignedToUserId;
      if (row.organizationId && Object.keys(orgPatch).length > 0) {
        await fetch(`/api/admin/crm/organizations/${row.organizationId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(orgPatch),
        });
      }
      refresh();
      return;
    }
    await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    refresh();
  }

  // Clay-stijl inline-edit voor prospect-tekstvelden. `name` → het contact,
  // de rest → de enrichment-PATCH (coerce + total_reach server-side).
  async function fieldSave(
    id: string,
    field: string,
    value: string | null,
  ): Promise<void> {
    // Org-bedrijfsvelden schrijven naar de organisatie (zoals stage al doet).
    const orgField = ORG_PATCH_FIELDS[field];
    if (orgField) {
      const orgId = rowsById.get(id)?.organizationId;
      if (!orgId) {
        toast.error("Geen organisatie gekoppeld aan deze prospect");
        return;
      }
      await fetch(`/api/admin/crm/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          [orgField]:
            orgField === "aantalVestigingen"
              ? value
                ? Number(value)
                : null
              : value,
        }),
      });
      refresh();
      return;
    }
    const url = CONTACT_PATCH_FIELDS.has(field)
      ? `/api/admin/crm/contacts/${id}`
      : `/api/admin/crm/contacts/${id}/enrichment`;
    await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    refresh();
  }

  // Splits selectie in klanten (auth.user) en prospects (crm_contact) zodat
  // de polymorfe members-route beide takken juist wegschrijft.
  function splitSelection() {
    const userIds: string[] = [];
    const crmContactIds: string[] = [];
    for (const id of selectedArray) {
      if (rowsById.get(id)?.kind === "prospect") crmContactIds.push(id);
      else userIds.push(id);
    }
    return { userIds, crmContactIds };
  }

  async function bulkAddToList(listId: string) {
    if (selectedArray.length === 0) return;
    await fetch(`/api/admin/lead-lists/${listId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(splitSelection()),
    });
    setShowAddToList(false);
    clearSelection();
    refresh();
  }

  async function bulkRemoveFromList(listId: string) {
    if (selectedArray.length === 0) return;
    await fetch(`/api/admin/lead-lists/${listId}/members`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(splitSelection()),
    });
    clearSelection();
    refresh();
  }

  async function deleteList(listId: string) {
    if (!confirm("Weet je zeker dat je deze lijst wilt verwijderen?")) return;
    await fetch(`/api/admin/lead-lists/${listId}`, { method: "DELETE" });
    setActiveListId("all");
    refresh();
  }

  async function bulkDeletePeople() {
    if (selectedArray.length === 0) return;
    const { userIds, crmContactIds } = splitSelection();
    const msg =
      `Verwijder ${selectedArray.length} geselecteerde lead${selectedArray.length === 1 ? "" : "s"} definitief?\n\n` +
      "Prospects worden verwijderd. Klant-accounts worden verwijderd, behalve " +
      "(ex-)betalende klanten — die worden overgeslagen. Dit kan niet ongedaan worden.";
    if (!confirm(msg)) return;
    const res = await fetch("/api/admin/crm/people/bulk-delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ crmContactIds, userIds }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      alert(json?.error ?? "Verwijderen mislukt.");
      return;
    }
    const { deletedContacts, deletedUsers, skippedPaid } = json.data;
    if (skippedPaid > 0) {
      alert(
        `${deletedContacts + deletedUsers} verwijderd. ${skippedPaid} overgeslagen ` +
          "omdat het (ex-)betalende klanten zijn.",
      );
    }
    clearSelection();
    refresh();
  }

  // Visible kolommen in juiste volgorde. Combineer built-in + custom keys.
  // Filter ook op bestaande keys: een verwijderde custom kolom die nog in
  // iemands opgeslagen prefs zit mag geen spookkolom renderen.
  const visibleSet = useMemo(() => new Set(visible), [visible]);
  const allKeySet = useMemo(() => new Set(allKeys), [allKeys]);
  const orderedColumns = useMemo(() => {
    const known = new Set(order);
    const tail = allKeys.filter((c) => !known.has(c));
    return [...order, ...tail].filter(
      (c) => visibleSet.has(c) && allKeySet.has(c),
    );
  }, [order, visibleSet, allKeys, allKeySet]);

  const activeList = lists.find((l) => l.id === activeListId);

  // Lijsten per eigenaar (AM) voor de dropdown-rij. Volgorde = adminUsers;
  // lijsten van niet-(meer-)staff vallen onder "Overig".
  const listOwnerGroups = useMemo(() => {
    const byOwner = new Map<string, LeadListOption[]>();
    for (const l of lists) {
      const key = l.ownerUserId ?? "__none__";
      const arr = byOwner.get(key) ?? [];
      arr.push(l);
      byOwner.set(key, arr);
    }
    const groups: {
      ownerId: string;
      ownerName: string;
      lists: LeadListOption[];
    }[] = [];
    for (const u of adminUsers) {
      const own = byOwner.get(u.id);
      if (own?.length) {
        groups.push({
          ownerId: u.id,
          ownerName: u.name.split(" ")[0],
          lists: own,
        });
        byOwner.delete(u.id);
      }
    }
    const rest = [...byOwner.values()].flat();
    if (rest.length) {
      groups.push({ ownerId: "__rest__", ownerName: "Overig", lists: rest });
    }
    return groups;
  }, [lists, adminUsers]);

  return (
    <>
      <div className="flex flex-col gap-2.5 px-5 py-3 lg:px-7">
        {/* Titel links, compacte view-toggle (Personen / Organisaties) rechts */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-base font-bold tracking-tight text-[color:var(--navy)]">
            CRM
          </h1>
          <CrmTabs active={activeTab} onChange={onTabChange} />
        </div>

        {/* KPI-strook — elk KPI op één regel: label · waarde · detail */}
        <div className="flex flex-wrap overflow-hidden rounded-lg border border-[color:var(--border-soft)] bg-white">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex flex-1 items-baseline gap-1.5 whitespace-nowrap border-r border-[color:var(--border-soft)] px-3 py-1.5 last:border-r-0"
            >
              <span className="text-xs text-[color:var(--text-muted)]">
                {kpi.label}
              </span>
              <span className="text-sm font-bold tabular-nums text-[color:var(--navy)]">
                {kpi.value}
              </span>
              <span className="truncate text-[0.625rem] text-[color:var(--text-soft)]">
                {kpi.detail}
              </span>
            </div>
          ))}
        </div>

        <div className="brand-card overflow-hidden p-0">
          {/* Lijsten-rij: Alle + custom lijsten + Nieuwe */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-[color:var(--border-soft)] px-3 py-1.5">
            <TabButton
              active={activeListId === "all"}
              onClick={() => setActiveListId("all")}
              label="Alle leads"
              count={customers.length}
            />
            {/* Lijsten gegroepeerd per AM: één dropdown per eigenaar zodat de
                rij niet uit beeld loopt bij veel lijsten. */}
            {listOwnerGroups.map((g) => (
              <OwnerListsDropdown
                key={g.ownerId}
                ownerName={g.ownerName}
                lists={g.lists}
                activeListId={activeListId}
                onPick={setActiveListId}
                canDelete={(l) => isAdmin || l.ownerUserId === currentUserId}
                onDelete={deleteList}
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

          {activeListId !== "all" && activeList && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border-soft)] px-4 py-2">
              <span className="text-xs text-[color:var(--text-muted)]">
                {activeList.description}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <InlineSelect
                  placeholder="Hele lijst → funnel…"
                  options={[
                    { value: "eindklant", label: "Alles → Eindklant" },
                    { value: "reseller", label: "Alles → Reseller" },
                  ]}
                  onChange={async (v) => {
                    await fetch(
                      `/api/admin/lead-lists/${activeList.id}/prospect-type`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ prospectType: v }),
                      },
                    );
                    refresh();
                  }}
                />
                <LeadListCampaignSheet
                  listId={activeList.id}
                  listName={activeList.name}
                  canEdit={isAdmin || activeList.ownerUserId === currentUserId}
                  onApplied={refresh}
                  trigger={
                    <button className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]">
                      Campagne-stappen
                    </button>
                  }
                />
              </div>
            </div>
          )}

          {/* Filters + acties */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[color:var(--border-soft)] px-3 py-2">
            <div className="relative w-full sm:w-64">
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
              value={dispositionFilter}
              onChange={setDispositionFilter}
              label="Alle acties"
              specialNone="Nog geen actie"
              options={dispositionsByGroup().flatMap((g) =>
                g.items.map((d) => ({ value: d.key, label: d.label })),
              )}
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
            <button
              onClick={() => setHideLost((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-2.5 py-1.5 text-xs font-semibold",
                hideLost
                  ? "text-[color:var(--navy)]"
                  : "text-[color:var(--text-muted)]",
              )}
              style={{ background: "var(--bg)" }}
              title="Verberg prospects op stage Verloren/Churned (stage-filter op Verloren wint)"
            >
              {hideLost ? "✓ " : ""}Verberg verloren
            </button>
            <button
              onClick={() => setShowMoreFilters((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-2.5 py-2 text-xs font-semibold",
                showMoreFilters || extraFilterCount > 0
                  ? "text-[color:var(--navy)]"
                  : "text-[color:var(--text-muted)]",
              )}
              style={{ background: "var(--bg)" }}
              title="Account owner, discount-code, branche, grootte en score"
            >
              Meer filters
              {extraFilterCount > 0 && (
                <span className="rounded-full bg-[color:var(--orange)] px-1.5 text-[0.625rem] font-bold text-white">
                  {extraFilterCount}
                </span>
              )}
            </button>
            {showMoreFilters && (
              <>
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
                {/* GTM-targeting op prospect-verrijking */}
                <FilterSelect
                  value={industryFilter || "all"}
                  onChange={(v) => setIndustryFilter(v === "all" ? "" : v)}
                  label="Alle branches"
                  options={MKB_BRANCHES.map((b) => ({ value: b, label: b }))}
                />
                <FilterSelect
                  value={sizeFilter}
                  onChange={setSizeFilter}
                  label="Alle groottes"
                  options={[
                    { value: "1-10", label: "1-10" },
                    { value: "11-50", label: "11-50" },
                    { value: "51-200", label: "51-200" },
                    { value: "201-1000", label: "201-1000" },
                    { value: "1000+", label: "1000+" },
                  ]}
                />
                <input
                  type="number"
                  value={minScoreFilter}
                  onChange={(e) => setMinScoreFilter(e.target.value)}
                  placeholder="Min. score"
                  min={0}
                  max={100}
                  className="w-24 rounded-lg border border-[color:var(--border-soft)] px-2.5 py-2 text-sm outline-none focus:border-[color:var(--orange)]"
                  style={{ background: "var(--bg)" }}
                />
              </>
            )}
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--orange)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--orange-600)]"
                title="Voeg een nieuwe prospect-rij toe (inline)"
              >
                <Plus className="size-3.5" strokeWidth={2.2} />
                Nieuwe rij
              </button>
              <button
                onClick={() => setShowCsvImport(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-2.5 py-1.5 text-xs font-semibold"
                style={{ background: "var(--bg)" }}
                title="CSV import met auto-lijst"
              >
                <FileSpreadsheet className="size-3.5" strokeWidth={2.2} />
                CSV import
              </button>
              <button
                onClick={() => setShowAddProspect(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-2.5 py-1.5 text-xs font-semibold"
                style={{ background: "var(--bg)" }}
                title="Uitgebreid prospect-form (volledige velden + lijsten)"
              >
                <UserPlus className="size-3.5" strokeWidth={2.2} />
                Prospect toevoegen
              </button>
              <div
                className="inline-flex rounded-lg border border-[color:var(--border-soft)] bg-white p-0.5"
                title="Kolom-preset: wissel tussen belronde- en beheer-weergave"
              >
                {(Object.keys(COLUMN_PRESETS) as ColumnPresetKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-semibold",
                      activePreset === key
                        ? "bg-[color:var(--bg-deep)] text-[color:var(--navy)]"
                        : "text-[color:var(--text-muted)]",
                    )}
                  >
                    {COLUMN_PRESETS[key].label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowColumnManager(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] px-2.5 py-1.5 text-xs font-semibold"
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
              <InlineSelect
                placeholder="Set funnel…"
                options={[
                  { value: "eindklant", label: "Eindklant" },
                  { value: "reseller", label: "Reseller" },
                ]}
                onChange={(v) =>
                  bulkUpdate({ prospectType: v as "eindklant" | "reseller" })
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
              {isAdmin && (
                <button
                  onClick={bulkDeletePeople}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Verwijder lead{selectedCount === 1 ? "" : "s"}
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
            <div>
              {/* Funnel-toggle: twee gescheiden pijplijnen op één bord. */}
              <div className="mb-2 flex items-center gap-1 px-2">
                {(
                  [
                    { key: "eindklant", label: "Eindklant" },
                    { key: "reseller", label: "Reseller" },
                  ] as const
                ).map((f) => {
                  const n = filtered.filter(
                    (c) => c.prospectType === f.key,
                  ).length;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFunnel(f.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                        funnel === f.key
                          ? "bg-[color:var(--navy)] text-white"
                          : "bg-[color:var(--bg)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-deep)]",
                      )}
                    >
                      {f.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[0.625rem]",
                          funnel === f.key
                            ? "bg-white/20"
                            : "bg-white text-[color:var(--text-muted)]",
                        )}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
                {funnel === "reseller" && (
                  <span className="ml-2 text-xs text-[color:var(--text-soft)]">
                    Kolommen volgen de deck-flow. Voortgang loopt via de Partner-tab, niet via slepen.
                  </span>
                )}
              </div>
              <KanbanView
                funnel={funnel}
                customers={filtered
                  .filter((c) => c.prospectType === funnel)
                  .map((c) => ({
                    id: c.id,
                    name: c.name,
                    email: c.email,
                    crmStage: c.crmStage,
                    prospectType: c.prospectType,
                    resellerStage: c.resellerStage,
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
                onStageChange={(userId, stage) => rowUpdate(userId, { stage })}
              />
            </div>
          )}

          {/* Tabel + altijd-zichtbaar org-side-panel rechts */}
          {viewMode === "table" && (
          <div className="flex gap-4">
          <div className="scroll-visible min-w-0 flex-1 overflow-x-auto">
            <table
              className="border-separate border-spacing-0 text-sm"
              style={{
                tableLayout: "fixed",
                minWidth: "100%",
                width:
                  116 +
                  orderedColumns.reduce((sum, c) => sum + colWidth(c), 0),
              }}
            >
              <colgroup>
                <col style={{ width: 56 }} />
                {orderedColumns.map((col) => (
                  <col key={col} style={{ width: colWidth(col) }} />
                ))}
                {/* Filler vóór de actie-kolom: vangt de slack op zodat de
                    sticky actie-kolom rechts blijft plakken zonder gat. */}
                <col />
                <col style={{ width: 60 }} />
              </colgroup>
              <thead>
                <tr
                  className="text-[color:var(--text-soft)]"
                  style={{ background: "var(--bg)" }}
                >
                  <th className="border-b border-r border-[color:var(--border-soft)] px-2 text-center">
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
                    const Icon = columnIcon(col);
                    return (
                      <th
                        key={col}
                        draggable
                        onDragStart={(e) => {
                          // Slepen vanaf de resize-greep = resizen, geen reorder.
                          if (resizeRef.current) {
                            e.preventDefault();
                            return;
                          }
                          dragColRef.current = col;
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverCol !== col) setDragOverCol(col);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragColRef.current) {
                            moveColumn(dragColRef.current, col);
                          }
                          dragColRef.current = null;
                          setDragOverCol(null);
                        }}
                        onDragEnd={() => {
                          dragColRef.current = null;
                          setDragOverCol(null);
                        }}
                        title="Sleep de kolom naar links of rechts om te verplaatsen"
                        className={cn(
                          "group relative h-9 cursor-grab border-b border-r border-[color:var(--border-soft)] px-2 text-left text-xs font-medium active:cursor-grabbing",
                          dragOverCol === col &&
                            "border-l-2 border-l-[color:var(--orange)] bg-[color:var(--bg-deep)]",
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon
                            className="size-3 shrink-0 text-[color:var(--text-soft)]"
                            strokeWidth={2}
                          />
                          <span className="truncate">
                            {customDef
                              ? customDef.name
                              : COLUMN_LABELS[col as ColumnKey] ?? col}
                          </span>
                        </span>
                        {/* Resize-greep op de rechterrand (Excel/Clay) */}
                        <span
                          onPointerDown={(e) => startResize(col, e)}
                          onDoubleClick={() =>
                            setWidths((w) => {
                              const next = { ...w };
                              delete next[col];
                              return next;
                            })
                          }
                          title="Sleep om te verbreden — dubbelklik reset"
                          className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none bg-transparent hover:bg-[color:var(--orange)]/40"
                        />
                      </th>
                    );
                  })}
                  <th className="border-b border-[color:var(--border-soft)]"></th>
                  <th className="sticky right-0 z-20 border-b border-l border-[color:var(--border-soft)] bg-[color:var(--bg)] px-2"></th>
                </tr>
              </thead>
              <tbody>
                {addingInline && (
                  <InlineProspectRow
                    adminUsers={adminUsers}
                    activeListId={activeListId}
                    columns={orderedColumns}
                    onCancel={() => setAddingInline(false)}
                    onSaved={() => {
                      setAddingInline(false);
                      refresh();
                    }}
                  />
                )}
                {filtered.length === 0 && !addingInline ? (
                  <tr>
                    <td
                      colSpan={orderedColumns.length + 3}
                      className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      Geen contacten in dit filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isSel = selected.has(r.id);
                    return (
                    <tr
                      key={r.id}
                      className={cn(
                        "group",
                        isSel ? "bg-[color:var(--bg-deep)]" : "bg-white hover:bg-[color:var(--bg)]",
                      )}
                    >
                      <td className="h-8 border-b border-r border-[color:var(--border-soft)] px-1 align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleRow(r.id)}
                            aria-label={`Select ${r.email}`}
                          />
                          <button
                            onClick={() => openRecord(r)}
                            className="text-[color:var(--text-soft)] opacity-0 transition-opacity hover:text-[color:var(--navy)] group-hover:opacity-100"
                            title="Open record (side-panel)"
                            aria-label={`Open ${r.email}`}
                          >
                            <Expand className="size-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                      {orderedColumns.map((col) => (
                        <td
                          key={col}
                          className="h-8 truncate border-b border-r border-[color:var(--border-soft)] px-2 align-middle"
                        >
                          {col.startsWith("custom:") ? (
                            r.kind === "prospect" ? (
                              // Custom-velden zijn klant-attributen; prospects
                              // hebben die niet.
                              <span className="text-xs text-[color:var(--text-soft)]">
                                —
                              </span>
                            ) : (
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
                                refresh();
                              }}
                            />
                            )
                          ) : (
                            <CellRenderer
                              col={col as ColumnKey}
                              row={r}
                              adminUsers={adminUsers}
                              lists={lists}
                              onUpdate={(p) => rowUpdate(r.id, p)}
                              onOpenNotes={() => setNotesFor(r)}
                              onOpenProfile={() => setPersonFor(r)}
                              onFieldSave={(field, value) =>
                                fieldSave(r.id, field, value)
                              }
                              onDisposition={(orgId, key, dueAt) =>
                                rowDisposition(orgId, key, dueAt)
                              }
                            />
                          )}
                        </td>
                      ))}
                      <td className="border-b border-[color:var(--border-soft)]" />
                      <td className="sticky right-0 z-10 h-8 border-b border-l border-[color:var(--border-soft)] bg-inherit px-1 text-center align-middle">
                        {r.kind === "prospect" ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openRecord(r)}
                              className="text-[color:var(--text-soft)] hover:text-[color:var(--navy)]"
                              title="Open persoon-paneel (incl. funnel)"
                            >
                              <ArrowRight className="size-3.5" strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setEnrichFor(r)}
                              className="text-[color:var(--text-soft)] hover:text-[color:var(--orange)]"
                              title="Verrijking bewerken"
                            >
                              <Sparkles className="size-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openRecord(r)}
                            className="text-[color:var(--text-soft)] hover:text-[color:var(--navy)]"
                            title="Open klant-paneel"
                          >
                            <ArrowRight className="size-3.5" strokeWidth={2} />
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {dockedOrgId && (
            <aside className="sticky top-3 hidden h-[calc(100vh-90px)] w-[420px] shrink-0 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white xl:block">
              <OrgSidePanel
                key={dockedOrgId}
                docked
                orgId={dockedOrgId}
                admins={adminUsers}
                onClose={() => setDockedOrgId(null)}
                onChanged={refresh}
              />
            </aside>
          )}
          </div>

          )}

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
            <span>
              {filtered.length} geladen van {total}
              {activeList && ` in lijst "${activeList.name}"`}
            </span>
            {cursor && (
              <button
                onClick={() => void fetchPeople(false)}
                disabled={loadingPage}
                className="rounded-md border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--navy)] hover:bg-[color:var(--bg)] disabled:opacity-50"
              >
                {loadingPage ? "Laden…" : "Meer laden"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showCreateList && (
        <CreateListModal
          onClose={() => setShowCreateList(false)}
          onCreated={(newId) => {
            setShowCreateList(false);
            setActiveListId(newId);
            refresh();
          }}
        />
      )}

      {showColumnManager && (
        <ColumnManagerPanel
          visible={visible}
          order={order}
          customColumns={customColumns}
          allKeys={allKeys}
          onChange={(v, o) => {
            setVisible(v);
            setOrder(o);
          }}
          onClose={() => setShowColumnManager(false)}
          onCustomChange={() => refresh()}
        />
      )}

      {showAddProspect && (
        <AddProspectModal
          adminUsers={adminUsers}
          lists={lists.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
          onClose={() => setShowAddProspect(false)}
          onDone={() => {
            setShowAddProspect(false);
            refresh();
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
            refresh();
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

      {enrichFor && (
        <EnrichmentPanel
          prospect={enrichFor}
          onClose={() => setEnrichFor(null)}
          onSaved={() => {
            setEnrichFor(null);
            refresh();
          }}
        />
      )}

      {personFor && (
        <PersonSidePanel
          person={personFor}
          adminUsers={adminUsers}
          lists={lists}
          onClose={() => setPersonFor(null)}
          onOpenOrg={(orgId) => {
            setPersonFor(null);
            setDockedOrgId(orgId);
          }}
        />
      )}
    </>
  );
}

// ── Klant-side-panel: clean, getabd overzicht van alle klant-info uit de
//    bestaande rij-data (geen extra fetch). "Account profiel" linkt door naar
//    de volledige /admin/crm/[id]-subpagina. ──
function PersonSidePanel({
  person,
  adminUsers,
  lists,
  onClose,
  onOpenOrg,
}: {
  person: Customer;
  adminUsers: AdminUser[];
  lists: LeadListOption[];
  onClose: () => void;
  onOpenOrg?: (orgId: string) => void;
}) {
  const [tab, setTab] = useState<
    | "overzicht"
    | "activiteit"
    | "taken"
    | "commercie"
    | "apparaten"
    | "email"
    | "partner"
  >("overzicht");
  // Val terug op Overzicht als de Partner-tab niet bestaat (klant, geen prospect).
  useEffect(() => {
    if (tab === "partner" && person.kind !== "prospect") {
      setTab("overzicht");
    }
  }, [tab, person.kind]);
  const [timeline, setTimeline] = useState<
    { id: string; at: string; kind: string; title: string; detail: string | null }[]
  >([]);
  const [tlLoaded, setTlLoaded] = useState(false);
  const [tasks, setTasks] = useState<
    { id: string; title: string; kind: string; dueAt: string | null; completedAt: string | null }[]
  >([]);
  const [newTask, setNewTask] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  // E-mail-tab: pas fetchen als de tab geopend wordt (per-tab lazy), niet bij
  // panel-open. Gecachet binnen deze open-sessie.
  const [emails, setEmails] = useState<
    {
      id: string;
      subject: string;
      category: string;
      status: string;
      sentAt: string;
    }[]
  >([]);
  const [emailsLoaded, setEmailsLoaded] = useState(false);
  // Commercie-tab: support-snapshot (licenties/orders/subs/mails/orgs +
  // acties) pas fetchen bij tab-open. refetch-flag forceert herladen na een
  // actie (status-override, verleng, refund, ...).
  const [snapshot, setSnapshot] = useState<SupportSnapshot | null>(null);
  const [snapLoaded, setSnapLoaded] = useState(false);
  const [snapNonce, setSnapNonce] = useState(0);

  useEffect(() => {
    if (tab !== "commercie" && tab !== "apparaten") return;
    let active = true;
    fetch(`/api/admin/customers/${person.id}/support-snapshot`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) setSnapshot(d.snapshot);
      })
      .finally(() => {
        if (active) setSnapLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [tab, person.id, snapNonce]);

  useEffect(() => {
    if (tab !== "email" || emailsLoaded) return;
    let active = true;
    fetch(`/api/admin/customers/${person.id}/emails`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) setEmails(d.emails);
      })
      .finally(() => {
        if (active) setEmailsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [tab, emailsLoaded, person.id]);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/customers/${person.id}/timeline`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.success) setTimeline(d.entries);
      })
      .finally(() => {
        if (active) setTlLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [person.id]);

  async function loadTasks() {
    const r = await fetch(`/api/admin/crm/customers/${person.id}/tasks`);
    const d = await r.json();
    if (d.success) setTasks(d.data);
  }
  useEffect(() => {
    void loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person.id]);

  async function addTask() {
    const title = newTask.trim();
    if (!title) return;
    setSavingTask(true);
    try {
      await fetch(`/api/admin/crm/customers/${person.id}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setNewTask("");
      await loadTasks();
    } finally {
      setSavingTask(false);
    }
  }

  async function completeTask(id: string) {
    await fetch(`/api/admin/crm/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    await loadTasks();
  }

  const amName =
    adminUsers.find((u) => u.id === person.assignedToUserId)?.name ??
    "Niet toegewezen";
  const seg = SEGMENT_META[person.segment];
  const stageLabel =
    STAGE_OPTIONS.find((s) => s.key === person.crmStage)?.label ??
    person.crmStage;
  const tempLabel =
    TEMP_OPTIONS.find((t) => t.key === person.crmTemperature)?.label ??
    person.crmTemperature;
  const personLists = person.listIds
    .map((id) => lists.find((l) => l.id === id)?.name)
    .filter(Boolean) as string[];

  // Klant-tabs (Activiteit/Taken/Commercie/Apparaten/E-mail) draaien op
  // auth.user-endpoints; een prospect (crm_contact) heeft die data niet en de
  // Taken-POST zou een FK-violation geven. Een prospect ziet Overzicht + de
  // funnel; z'n activiteit/taken leven op de org (bereikbaar via de spring-link).
  const isProspect = person.kind === "prospect";
  // Partner-tab (reseller-deck-cockpit) voor ALLE prospects zichtbaar. We verbergen
  // 'm bewust NIET op prospect_type, want zolang de 230 leads nog niet handmatig
  // geclassificeerd zijn zou dat de halve partner-pipeline verstoppen. De reseller-
  // only-beperking komt pas terug als de classificatie compleet is (migratie 0052).
  const TABS: { key: typeof tab; label: string }[] = [
    { key: "overzicht", label: "Overzicht" },
    ...(isProspect
      ? [{ key: "partner" as const, label: "Partner" }]
      : [
          { key: "activiteit" as const, label: "Activiteit" },
          { key: "taken" as const, label: "Taken" },
          { key: "commercie" as const, label: "Commercie" },
          { key: "apparaten" as const, label: "Apparaten" },
          { key: "email" as const, label: "E-mail" },
        ]),
  ];

  return (
    <EntitySidePanel
      mode="person"
      maxWidthClass="max-w-md"
      eyebrow={
        <span
          className="mb-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold"
          style={{ background: seg.chipBg, color: seg.chipFg }}
        >
          {seg.label}
        </span>
      }
      title={person.name}
      titleMeta={
        <span className="truncate text-[color:var(--text-soft)]">
          {person.email}
        </span>
      }
      link={
        person.organizationId && onOpenOrg
          ? {
              label: "Bekijk organisatie",
              onJump: () => onOpenOrg(person.organizationId as string),
            }
          : null
      }
      tabs={TABS}
      activeTab={tab}
      onTabChange={(k) => setTab(k as typeof tab)}
      override={
        // Alleen voor klanten: person.id is dan de auth-user-id en /admin/crm/[userId]
        // bestaat. Een prospect/partner heeft geen detail-page (de side-panel ís het
        // profiel), dus daar geen knop — die zou 404'en.
        isProspect ? undefined : (
          <Link
            href={`/admin/crm/${person.id}`}
            className="flex w-full items-center justify-center rounded-lg bg-[color:var(--orange)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--orange-600)]"
          >
            Account profiel openen →
          </Link>
        )
      }
      onClose={onClose}
    >
          {tab === "overzicht" && (
            <div className="space-y-3">
              <AccountSignalsBlock email={person.email} />
              <div className="space-y-1">
              <InfoRow label="Stage" value={stageLabel} />
              <InfoRow label="Temperatuur" value={tempLabel} />
              <InfoRow label="Account manager" value={amName} />
              <InfoRow
                label="Reseller"
                value={person.accountOwner?.name ?? "—"}
                hint={person.accountOwner?.code}
              />
              <InfoRow label="Lid sinds" value={formatDate(person.createdAt)} />
              <InfoRow
                label="E-mail geverifieerd"
                value={person.emailVerified ? "Ja" : "Nee"}
              />
              <InfoRow
                label="Lijsten"
                value={personLists.length ? personLists.join(", ") : "—"}
              />
              {person.notes && (
                <div className="mt-3 rounded-lg bg-[color:var(--bg)] p-3 text-xs text-[color:var(--text-muted)]">
                  {person.notes}
                </div>
              )}
              </div>
            </div>
          )}

          {tab === "activiteit" && (
            <div>
              {!tlLoaded ? (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Laden…
                </p>
              ) : timeline.length === 0 ? (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Nog geen activiteit voor deze klant.
                </p>
              ) : (
                <ul className="space-y-0">
                  {timeline.map((e, i) => (
                    <li
                      key={e.id}
                      className={cn(
                        "flex items-start gap-3 py-2.5",
                        i > 0 && "border-t border-[color:var(--border-soft)]",
                      )}
                    >
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[color:var(--orange)]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[color:var(--navy)]">
                          {e.title}
                        </div>
                        {e.detail && (
                          <div className="truncate text-[0.6875rem] text-[color:var(--text-muted)]">
                            {e.detail}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-[0.625rem] text-[color:var(--text-soft)]">
                        {formatDate(e.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "taken" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addTask();
                  }}
                  placeholder="Nieuwe taak…"
                  className="flex-1 rounded-lg border border-[color:var(--border-soft)] px-2.5 py-1.5 text-sm outline-none focus:border-[color:var(--orange)]"
                />
                <button
                  onClick={addTask}
                  disabled={savingTask || !newTask.trim()}
                  className="shrink-0 rounded-lg bg-[color:var(--orange)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  +
                </button>
              </div>
              {tasks.length === 0 ? (
                <p className="py-4 text-center text-xs text-[color:var(--text-soft)]">
                  Nog geen taken voor deze klant.
                </p>
              ) : (
                <ul className="space-y-0">
                  {tasks.map((t, i) => (
                    <li
                      key={t.id}
                      className={cn(
                        "flex items-center gap-2 py-2",
                        i > 0 && "border-t border-[color:var(--border-soft)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!t.completedAt}
                        disabled={!!t.completedAt}
                        onChange={() => completeTask(t.id)}
                        className="shrink-0"
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-xs",
                          t.completedAt
                            ? "text-[color:var(--text-soft)] line-through"
                            : "text-[color:var(--navy)]",
                        )}
                      >
                        {t.title}
                      </span>
                      {t.dueAt && (
                        <span className="shrink-0 text-[0.625rem] text-[color:var(--text-soft)]">
                          {formatDate(t.dueAt)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "commercie" && (
            <div className="space-y-4">
              <div className="space-y-1">
              <InfoRow
                label="Betaalde licenties"
                value={String(person.paidLicenseCount)}
              />
              <InfoRow
                label="Trial gestart"
                value={
                  person.trialStartedAt
                    ? formatDate(person.trialStartedAt)
                    : "—"
                }
              />
              <InfoRow
                label="Trial loopt tot"
                value={
                  person.trialExpiresAt
                    ? formatDate(person.trialExpiresAt)
                    : "—"
                }
              />
              <InfoRow
                label="Licentie-bron"
                value={person.licenseSource ?? "—"}
              />
              <InfoRow
                label="Korting"
                value={
                  formatDiscount(person.discountType, person.discountValue) ??
                  "—"
                }
              />
              <InfoRow
                label="Mollie customer"
                value={person.mollieCustomerId ?? "—"}
              />
              <InfoRow
                label="Abonnement"
                value={person.subscriptionStatus ?? "—"}
              />
              <InfoRow
                label="Volgende incasso"
                value={
                  person.nextBillingAt
                    ? formatDate(person.nextBillingAt)
                    : "—"
                }
              />
              </div>

              {!snapLoaded ? (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Acties laden…
                </p>
              ) : snapshot ? (
                <SupportActions
                  snapshot={snapshot}
                  onAction={() => setSnapNonce((n) => n + 1)}
                />
              ) : (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Geen account-data voor deze klant.
                </p>
              )}
            </div>
          )}

          {tab === "apparaten" && (
            <div className="space-y-3">
              {!snapLoaded ? (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Laden…
                </p>
              ) : !snapshot || snapshot.licenses.length === 0 ? (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Geen licenties/apparaten voor deze klant.
                </p>
              ) : (
                snapshot.licenses.map((l) => {
                  const active = l.activations.filter((a) => a.isActive);
                  return (
                    <div
                      key={l.id}
                      className="rounded-lg border border-[color:var(--border-soft)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <code className="truncate font-mono text-xs font-bold text-[color:var(--navy)]">
                          {l.code}
                        </code>
                        <span className="shrink-0 text-[0.625rem] text-[color:var(--text-muted)]">
                          {l.activeDeviceCount}/{l.deviceLimit} apparaten
                        </span>
                      </div>
                      <div className="text-[0.625rem] text-[color:var(--text-soft)]">
                        {l.planLabel ?? l.type} · {l.status}
                      </div>
                      {active.length === 0 ? (
                        <p className="mt-1 text-[0.625rem] text-[color:var(--text-soft)]">
                          Geen actief apparaat.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-0">
                          {active.map((a, i) => (
                            <li
                              key={a.activationId}
                              className={cn(
                                "flex items-center gap-2 py-1.5",
                                i > 0 &&
                                  "border-t border-[color:var(--border-soft)]",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate text-xs">
                                {a.platform ?? "onbekend apparaat"}
                              </span>
                              <span className="shrink-0 text-[0.625rem] text-[color:var(--text-soft)]">
                                gezien {a.lastSeenAt ? formatDate(a.lastSeenAt) : "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
              <p className="text-[0.625rem] text-[color:var(--text-soft)]">
                Loskoppelen kan via de Commercie-tab (support-acties).
              </p>
            </div>
          )}

          {tab === "email" && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {([
                  ["Verstuurd", person.emailsSent, false],
                  ["Geopend", person.emailsOpened, false],
                  ["Geklikt", person.emailsClicked, false],
                  ["Bounced", person.emailsBounced, person.emailsBounced > 0],
                ] as [string, number, boolean][]).map(([label, val, alert]) => (
                  <div
                    key={label}
                    className="rounded-md border border-[color:var(--border-soft)] py-1.5"
                  >
                    <div
                      className="text-sm font-bold tabular-nums"
                      style={{ color: alert ? "var(--red)" : "var(--navy)" }}
                    >
                      {val}
                    </div>
                    <div className="text-[0.5625rem] text-[color:var(--text-soft)]">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {!emailsLoaded ? (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Mails laden…
                </p>
              ) : emails.length === 0 ? (
                <p className="py-6 text-center text-xs text-[color:var(--text-soft)]">
                  Nog geen mails via Resend naar deze klant.
                </p>
              ) : (
                <ul className="space-y-0">
                  {emails.map((m, i) => (
                    <li
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2 py-2",
                        i > 0 && "border-t border-[color:var(--border-soft)]",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-[color:var(--navy)]">
                          {m.subject}
                        </div>
                        <div className="text-[0.625rem] text-[color:var(--text-soft)]">
                          {m.category}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className="inline-block rounded-full px-1.5 py-0.5 text-[0.5625rem] font-semibold"
                          style={emailStatusTone(m.status)}
                        >
                          {m.status}
                        </span>
                        <div className="mt-0.5 text-[0.625rem] text-[color:var(--text-soft)]">
                          {formatDate(m.sentAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

      {tab === "partner" && (
        <>
          <FunnelCockpit contactId={person.id} />
          <BrandIdentityBlock contactId={person.id} />
        </>
      )}
    </EntitySidePanel>
  );
}

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--border-soft)] py-1.5">
      <span className="shrink-0 text-[0.6875rem] font-semibold text-[color:var(--text-soft)]">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-xs text-[color:var(--navy)]">
        {value}
        {hint ? (
          <span className="ml-1 font-mono text-[0.625rem] text-[color:var(--text-soft)]">
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}

// ── Verrijking-side-panel: een AM bewerkt de Clay-aligned velden van een
//    prospect tijdens prospecting. Saved via PATCH .../enrichment; total_reach
//    wordt server-side herberekend. ──
const SENIORITY_OPTIONS = ["C-level", "VP", "Director", "Manager", "IC"];
const SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const CHANNEL_OPTIONS = ["email", "linkedin", "phone", "other"];

function EnrichmentPanel({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const e = prospect.enrichment;
  const [form, setForm] = useState({
    jobTitle: e?.jobTitle ?? "",
    seniority: e?.seniority ?? "",
    department: e?.department ?? "",
    linkedinUrl: e?.linkedinUrl ?? "",
    twitterUrl: e?.twitterUrl ?? "",
    city: e?.city ?? "",
    country: e?.country ?? "",
    companyName: e?.companyName ?? "",
    companyDomain: e?.companyDomain ?? "",
    niche: e?.niche ?? "",
    industry: e?.industry ?? "",
    companySizeRange: e?.companySizeRange ?? "",
    employeeCount: e?.employeeCount?.toString() ?? "",
    revenueRange: e?.revenueRange ?? "",
    foundedYear: e?.foundedYear?.toString() ?? "",
    followersLinkedin: e?.followersLinkedin?.toString() ?? "",
    followersInstagram: e?.followersInstagram?.toString() ?? "",
    followersFacebook: e?.followersFacebook?.toString() ?? "",
    followersYoutube: e?.followersYoutube?.toString() ?? "",
    followersSubstack: e?.followersSubstack?.toString() ?? "",
    followersOwn: e?.followersOwn?.toString() ?? "",
    leadScore: e?.leadScore?.toString() ?? "",
    lastChannel: e?.lastChannel ?? "",
  });
  const [saving, setSaving] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const liveReach =
    [
      form.followersLinkedin,
      form.followersInstagram,
      form.followersFacebook,
      form.followersYoutube,
      form.followersSubstack,
      form.followersOwn,
    ].reduce((sum, v) => sum + (Number(v) || 0), 0) || 0;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/crm/contacts/${prospect.id}/enrichment`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (res.ok) onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--border-soft)] p-4">
          <div>
            <h2 className="text-base font-bold text-[color:var(--navy)]">
              Verrijking — {prospect.name}
            </h2>
            <p className="text-xs text-[color:var(--text-soft)]">
              {prospect.email}
              {e?.enrichmentSource ? ` · bron: ${e.enrichmentSource}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--bg-deep)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <EnrichSection title="Persoon">
            <EnrichField label="Functietitel" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
            <EnrichSelect label="Senioriteit" value={form.seniority} onChange={(v) => set("seniority", v)} options={SENIORITY_OPTIONS} />
            <EnrichField label="Afdeling" value={form.department} onChange={(v) => set("department", v)} />
            <EnrichField label="LinkedIn-URL" value={form.linkedinUrl} onChange={(v) => set("linkedinUrl", v)} />
            <EnrichField label="Twitter/X-URL" value={form.twitterUrl} onChange={(v) => set("twitterUrl", v)} />
            <EnrichField label="Stad" value={form.city} onChange={(v) => set("city", v)} />
            <EnrichField label="Land" value={form.country} onChange={(v) => set("country", v)} />
          </EnrichSection>

          <EnrichSection title="Bedrijf">
            <EnrichField label="Bedrijfsnaam" value={form.companyName} onChange={(v) => set("companyName", v)} />
            <EnrichField label="Domein" value={form.companyDomain} onChange={(v) => set("companyDomain", v)} />
            <EnrichField label="Niche" value={form.niche} onChange={(v) => set("niche", v)} />
            <EnrichSelect label="Branche" value={form.industry} onChange={(v) => set("industry", v)} options={[...MKB_BRANCHES]} />
            <EnrichSelect label="Bedrijfsgrootte" value={form.companySizeRange} onChange={(v) => set("companySizeRange", v)} options={SIZE_OPTIONS} />
            <EnrichField label="Aantal medewerkers" value={form.employeeCount} onChange={(v) => set("employeeCount", v)} type="number" />
            <EnrichField label="Omzet-range" value={form.revenueRange} onChange={(v) => set("revenueRange", v)} />
            <EnrichField label="Opgericht (jaar)" value={form.foundedYear} onChange={(v) => set("foundedYear", v)} type="number" />
          </EnrichSection>

          <EnrichSection title={`Social-bereik — totaal ${formatReach(liveReach)}`}>
            <EnrichField label="LinkedIn-volgers" value={form.followersLinkedin} onChange={(v) => set("followersLinkedin", v)} type="number" />
            <EnrichField label="Instagram-volgers" value={form.followersInstagram} onChange={(v) => set("followersInstagram", v)} type="number" />
            <EnrichField label="Facebook-volgers" value={form.followersFacebook} onChange={(v) => set("followersFacebook", v)} type="number" />
            <EnrichField label="YouTube-abonnees" value={form.followersYoutube} onChange={(v) => set("followersYoutube", v)} type="number" />
            <EnrichField label="Substack-abonnees" value={form.followersSubstack} onChange={(v) => set("followersSubstack", v)} type="number" />
            <EnrichField label="Eigen platform" value={form.followersOwn} onChange={(v) => set("followersOwn", v)} type="number" />
          </EnrichSection>

          <EnrichSection title="Scoring + outreach">
            <EnrichField label="Lead-score (0-100)" value={form.leadScore} onChange={(v) => set("leadScore", v)} type="number" />
            <EnrichSelect label="Laatste kanaal" value={form.lastChannel} onChange={(v) => set("lastChannel", v)} options={CHANNEL_OPTIONS} />
          </EnrichSection>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border-soft)] p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[color:var(--border-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--text-muted)]"
          >
            Annuleren
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[color:var(--orange)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnrichSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[color:var(--text-soft)]">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function EnrichField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className="rounded-lg border border-[color:var(--border-soft)] px-2 py-1.5 text-sm font-normal text-[color:var(--navy)] outline-none focus:border-[color:var(--orange)]"
        style={{ background: "var(--bg)" }}
      />
    </label>
  );
}

function EnrichSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
      {label}
      <select
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className="rounded-lg border border-[color:var(--border-soft)] px-2 py-1.5 text-sm font-normal text-[color:var(--navy)] outline-none focus:border-[color:var(--orange)]"
        style={{ background: "var(--bg)" }}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// Eén dropdown per lijst-eigenaar (AM). Toont de voornaam; opent een paneel
// met diens lijsten. Houdt de lijsten-rij kort, ook bij tientallen lijsten.
function OwnerListsDropdown({
  ownerName,
  lists,
  activeListId,
  onPick,
  canDelete,
  onDelete,
}: {
  ownerName: string;
  lists: LeadListOption[];
  activeListId: string;
  onPick: (id: string) => void;
  canDelete: (l: LeadListOption) => boolean;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Fixed-positie vanaf de knop: de lijsten-rij heeft overflow-x-auto en zou
  // een absoluut paneel afknippen; position:fixed ontsnapt daaraan.
  const [panelPos, setPanelPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const activeOwn = lists.find((l) => l.id === activeListId);

  function toggleOpen() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPanelPos({ left: r.left, top: r.bottom + 4 });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs",
          activeOwn
            ? "bg-[color:var(--bg-deep)] font-bold text-[color:var(--navy)]"
            : "font-medium text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
        )}
        title={`Lijsten van ${ownerName}`}
      >
        {activeOwn && (
          <span
            className="size-2 rounded-full"
            style={{ background: LIST_COLOR_BG[activeOwn.color] ?? "#6B7280" }}
          />
        )}
        {ownerName}
        {activeOwn ? ` · ${activeOwn.name}` : ""}
        <span className="rounded-full bg-[color:var(--bg)] px-1.5 text-[0.625rem] font-bold tabular-nums">
          {lists.length}
        </span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          strokeWidth={2.4}
        />
      </button>
      {open && (
        <>
          {/* Klik-buiten sluit het paneel */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 min-w-56 rounded-lg border border-[color:var(--border-soft)] bg-white py-1 shadow-lg"
            style={{ left: panelPos.left, top: panelPos.top }}
          >
            {lists.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "group flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[color:var(--bg)]",
                  l.id === activeListId
                    ? "font-bold text-[color:var(--navy)]"
                    : "text-[color:var(--text-muted)]",
                )}
              >
                <button
                  onClick={() => {
                    onPick(l.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: LIST_COLOR_BG[l.color] ?? "#6B7280" }}
                  />
                  <span className="truncate">{l.name}</span>
                  <span className="ml-auto tabular-nums text-[0.625rem]">
                    {l.memberCount}
                  </span>
                </button>
                {canDelete(l) && (
                  <button
                    onClick={() => onDelete(l.id)}
                    className="hidden shrink-0 text-[color:var(--text-soft)] hover:text-red-600 group-hover:block"
                    title="Verwijder lijst"
                  >
                    <Trash2 className="size-3" strokeWidth={2.2} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
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
        "group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs",
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
      className="rounded-lg border border-[color:var(--border-soft)] px-2.5 py-1.5 text-xs outline-none focus:border-[color:var(--orange)]"
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

// Quick-action dropdown per rij: kies een beluitkomst. Dispositions die een datum
// vragen (am_choice) tonen een datumveld; auto-dispositions vuren direct.
function DispositionPicker({
  doNotCall,
  onPick,
}: {
  doNotCall: boolean;
  onPick: (key: string, dueAt?: string | null) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  if (doNotCall) {
    return (
      <span className="text-[0.625rem] font-semibold text-[color:var(--danger,#dc2626)]">
        ⛔ Niet bellen
      </span>
    );
  }
  if (pending) {
    return (
      <input
        type="date"
        autoFocus
        className="w-full rounded-md border border-[color:var(--border-soft)] bg-white px-1 py-1 text-xs"
        onChange={(e) => {
          if (e.target.value) {
            onPick(pending, new Date(e.target.value).toISOString());
            setPending(null);
          }
        }}
        onBlur={() => setPending(null)}
      />
    );
  }
  return (
    <select
      value=""
      onChange={(e) => {
        const key = e.target.value;
        if (!key) return;
        const d = DISPOSITION_BY_KEY[key];
        if (d?.dateMode === "am_choice") {
          setPending(key);
        } else {
          onPick(key);
        }
        e.target.value = "";
      }}
      className="w-full rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-xs"
    >
      <option value="">Actie…</option>
      {dispositionsByGroup().map((g) => (
        <optgroup key={g.group} label={g.label}>
          {g.items.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function CellRenderer({
  col,
  row,
  adminUsers,
  lists,
  onUpdate,
  onOpenNotes,
  onOpenProfile,
  onFieldSave,
  onDisposition,
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
  onOpenProfile?: () => void;
  onFieldSave?: (field: string, value: string | null) => void | Promise<void>;
  onDisposition?: (orgId: string, key: string, dueAt?: string | null) => void;
}) {
  const isProspect = row.kind === "prospect";
  switch (col) {
    case "customer": {
      const title = [
        row.email,
        isProspect ? row.company : null,
        !isProspect && !row.emailVerified ? "niet geverifieerd" : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const avatar = (
        <CompanyFavicon
          domain={isProspect ? row.enrichment?.companyDomain ?? null : null}
          isProspect={isProspect}
        />
      );
      // Prospect-naam is inline bewerkbaar; klant-naam linkt naar de detailpagina.
      if (isProspect) {
        return (
          <div className="flex items-center gap-2" title={title}>
            {avatar}
            <span className="min-w-0 flex-1">
              <EditableText
                value={row.name}
                placeholder="Naam"
                bold
                onSave={(v) => onFieldSave?.("name", v)}
              />
            </span>
            {row.hasAccount && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-green-800"
                title="Heeft een account — beheer in /admin/users"
              >
                <BadgeCheck className="size-3" strokeWidth={2.2} />
                account
              </span>
            )}
          </div>
        );
      }
      return (
        <button
          onClick={onOpenProfile}
          className="flex w-full items-center gap-2 text-left"
          title={title}
        >
          {avatar}
          <span className="truncate text-sm font-semibold text-[color:var(--navy)]">
            {row.name}
          </span>
        </button>
      );
    }
    case "email": {
      // Geen querystring-smokkel (?bcc=…&body=…) de mailto-link in.
      const cleanEmail = row.email.split("?")[0];
      return (
        <a
          href={`mailto:${cleanEmail}`}
          className="block truncate text-xs text-blue-600 hover:underline"
          title={row.email}
        >
          {row.email}
        </a>
      );
    }
    case "phone": {
      if (!row.phone)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      const cleanPhone = row.phone.replace(/[^0-9+\- ()]/g, "");
      return (
        <a
          href={`tel:${cleanPhone}`}
          className="block truncate text-xs font-semibold text-[color:var(--navy)] hover:underline"
          title={`Bel ${row.phone}`}
        >
          {row.phone}
        </a>
      );
    }
    case "contactFirstName":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.firstName}
          placeholder="—"
          onSave={(v) => onFieldSave?.("firstName", v)}
        />
      );
    case "contactLastName":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.lastName}
          placeholder="—"
          onSave={(v) => onFieldSave?.("lastName", v)}
        />
      );
    case "contactRole":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.roleAtCompany}
          placeholder="—"
          onSave={(v) => onFieldSave?.("roleAtCompany", v)}
        />
      );
    case "contactMobile": {
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      // Inline editbaar; gevulde waarde is meteen een bel-link.
      if (row.mobilePhone) {
        const clean = row.mobilePhone.replace(/[^0-9+\- ()]/g, "");
        return (
          <span className="flex items-center gap-1">
            <a
              href={`tel:${clean}`}
              className="min-w-0 flex-1 truncate text-xs font-semibold text-[color:var(--navy)] hover:underline"
              title={`Bel ${row.mobilePhone}`}
            >
              {row.mobilePhone}
            </a>
          </span>
        );
      }
      return (
        <EditableText
          value={row.mobilePhone}
          placeholder="—"
          onSave={(v) => onFieldSave?.("mobilePhone", v)}
        />
      );
    }
    case "orgKvk":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.orgKvk}
          placeholder="—"
          onSave={(v) => onFieldSave?.("orgKvk", v)}
        />
      );
    case "orgVatNumber":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.orgVatNumber}
          placeholder="—"
          onSave={(v) => onFieldSave?.("orgVatNumber", v)}
        />
      );
    case "orgBrancheVereniging":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.orgBrancheVereniging}
          placeholder="—"
          onSave={(v) => onFieldSave?.("orgBrancheVereniging", v)}
        />
      );
    case "orgAantalVestigingen":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={
            row.orgAantalVestigingen == null
              ? null
              : String(row.orgAantalVestigingen)
          }
          placeholder="—"
          onSave={(v) => onFieldSave?.("orgAantalVestigingen", v)}
        />
      );
    case "orgHoofdkantoor":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.orgHoofdkantoor}
          placeholder="—"
          onSave={(v) => onFieldSave?.("orgHoofdkantoor", v)}
        />
      );
    case "orgSpecialisatie":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.orgSpecialisatie}
          placeholder="—"
          onSave={(v) => onFieldSave?.("orgSpecialisatie", v)}
        />
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
    case "action": {
      if (!isProspect || !row.organizationId) {
        return <span className="text-[color:var(--text-soft)]">—</span>;
      }
      const orgId = row.organizationId;
      return (
        <DispositionPicker
          doNotCall={row.doNotCall ?? false}
          onPick={(key, dueAt) => onDisposition?.(orgId, key, dueAt)}
        />
      );
    }
    case "disposition":
      return row.lastDisposition ? (
        <span
          className="block truncate text-xs text-[color:var(--text-muted)]"
          title={row.lastDispositionAt ? formatDate(row.lastDispositionAt) : undefined}
        >
          {dispositionLabel(row.lastDisposition)}
          {row.doNotCall ? " · ⛔" : ""}
          {row.wrongNumber ? " · ☎✗" : ""}
        </span>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "nextAction": {
      if (!row.nextAction) {
        return <span className="text-[color:var(--text-soft)]">—</span>;
      }
      const due = row.nextActionAt ? new Date(row.nextActionAt) : null;
      const overdue = due ? due.getTime() < Date.now() : false;
      return (
        <span className="block truncate text-xs" title={row.nextAction}>
          {row.nextAction}
          {due ? (
            <span
              className={
                overdue
                  ? "font-semibold text-[color:var(--danger,#dc2626)]"
                  : "text-[color:var(--text-soft)]"
              }
            >
              {" · "}
              {formatDate(row.nextActionAt as string)}
            </span>
          ) : null}
        </span>
      );
    }
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
      return row.trialExpiresAt ? (
        <span
          className="block truncate text-xs text-[color:var(--text-muted)]"
          title={`${row.trialStartedAt ? `start ${formatDate(row.trialStartedAt)} · ` : ""}loopt tot ${formatDate(row.trialExpiresAt)}`}
        >
          tot {formatDate(row.trialExpiresAt)}
        </span>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "mollie":
      return row.mollieCustomerId ? (
        <span
          className="block truncate text-xs text-[color:var(--text-muted)]"
          title={row.mollieCustomerId}
        >
          {row.subscriptionStatus ? `sub ${row.subscriptionStatus}` : "klant"}
        </span>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "discount": {
      const label = formatDiscount(row.discountType, row.discountValue);
      return label || row.licenseSource ? (
        <span
          className="block truncate text-xs font-semibold text-[color:var(--orange-600)]"
          title={[label, row.licenseSource].filter(Boolean).join(" · ")}
        >
          {label ?? row.licenseSource}
        </span>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    }
    case "mails":
      return (
        <span
          className="block truncate font-mono text-xs text-[color:var(--text-muted)]"
          title={`${row.emailsSent} verstuurd · ${row.emailsOpened} geopend · ${row.emailsClicked} geklikt`}
        >
          {row.emailsSent}✉ {row.emailsOpened}↗
        </span>
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
          className="inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[0.625rem] font-semibold hover:underline"
          style={{
            background: "color-mix(in srgb, #7c3aed 14%, white)",
            color: "#7c3aed",
          }}
          title={`Reseller: ${row.accountOwner.name} · ${row.accountOwner.code}`}
        >
          <span className="truncate">⟁ {row.accountOwner.name}</span>
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
    case "lists": {
      const rowLists = row.listIds
        .map((id) => lists.find((x) => x.id === id))
        .filter(Boolean) as LeadListOption[];
      const first = rowLists[0];
      return (
        <span className="flex items-center gap-1 overflow-hidden">
          {first && (
            <span
              className="truncate rounded px-1.5 py-0.5 text-[0.625rem] font-semibold text-white"
              style={{ background: LIST_COLOR_BG[first.color] }}
              title={rowLists.map((l) => l.name).join(", ")}
            >
              {first.name}
            </span>
          )}
          {rowLists.length > 1 && (
            <span className="shrink-0 text-[0.625rem] font-semibold text-[color:var(--text-soft)]">
              +{rowLists.length - 1}
            </span>
          )}
          {rowLists.length === 0 && (
            <span className="text-[color:var(--text-soft)]">—</span>
          )}
        </span>
      );
    }
    case "niche":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.enrichment?.niche ?? null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("niche", v)}
        />
      );
    case "industry":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <select
          value={row.enrichment?.industry ?? ""}
          onChange={(e) => onFieldSave?.("industry", e.target.value || null)}
          className="w-full cursor-pointer truncate rounded bg-transparent text-xs text-[color:var(--text-muted)] outline-none hover:bg-black/[0.03]"
        >
          <option value="">—</option>
          {MKB_BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      );
    case "companySize":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={
            row.enrichment?.companySizeRange ??
            (row.enrichment?.employeeCount != null
              ? String(row.enrichment.employeeCount)
              : null)
          }
          placeholder="—"
          onSave={(v) => onFieldSave?.("companySizeRange", v)}
        />
      );
    case "reach":
      return row.enrichment?.totalReach != null ? (
        <span
          className="block truncate font-mono text-xs font-semibold text-[color:var(--navy)]"
          title={`${row.enrichment.totalReach} totaal bereik`}
        >
          {formatReach(row.enrichment.totalReach)}
        </span>
      ) : (
        <span className="text-[color:var(--text-soft)]">—</span>
      );
    case "leadScore":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <span className="flex items-center gap-1.5">
          {row.enrichment?.leadScore != null && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: scoreColor(row.enrichment.leadScore) }}
            />
          )}
          <EditableText
            value={
              row.enrichment?.leadScore != null
                ? String(row.enrichment.leadScore)
                : null
            }
            placeholder="—"
            type="number"
            onSave={(v) => onFieldSave?.("leadScore", v)}
          />
        </span>
      );
    case "jobTitle":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.enrichment?.jobTitle ?? null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("jobTitle", v)}
        />
      );
    case "seniority":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.enrichment?.seniority ?? null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("seniority", v)}
        />
      );
    case "city":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.enrichment?.city ?? null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("city", v)}
        />
      );
    case "companyName":
      if (!isProspect)
        return <EnrichmentTextCell value={row.company ?? null} />;
      return (
        <EditableText
          value={row.enrichment?.companyName ?? row.company ?? null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("companyName", v)}
        />
      );
    case "revenueRange":
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      return (
        <EditableText
          value={row.enrichment?.revenueRange ?? null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("revenueRange", v)}
        />
      );
    case "companyDomain": {
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      const d = row.enrichment?.companyDomain ?? null;
      return d ? (
        <a
          href={d.startsWith("http") ? d : `https://${d}`}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-xs text-blue-600 hover:underline"
          title={d}
        >
          {d.replace(/^https?:\/\//, "")}
        </a>
      ) : (
        <EditableText
          value={null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("companyDomain", v)}
        />
      );
    }
    case "linkedinUrl": {
      if (!isProspect)
        return <span className="text-[color:var(--text-soft)]">—</span>;
      const u = row.enrichment?.linkedinUrl ?? null;
      return u ? (
        <a
          href={u.startsWith("http") ? u : `https://${u}`}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-xs text-blue-600 hover:underline"
          title={u}
        >
          {u.replace(/^https?:\/\/(www\.)?linkedin\.com\//, "")}
        </a>
      ) : (
        <EditableText
          value={null}
          placeholder="—"
          onSave={(v) => onFieldSave?.("linkedinUrl", v)}
        />
      );
    }
    default:
      return null;
  }
}

/** Read-only enrichment-tekstcel (single-line, truncate, tooltip). */
function EnrichmentTextCell({ value }: { value: string | null }) {
  return value ? (
    <span
      className="block truncate text-xs text-[color:var(--text-muted)]"
      title={value}
    >
      {value}
    </span>
  ) : (
    <span className="text-[color:var(--text-soft)]">—</span>
  );
}

// Clay-stijl inline-bewerkbare cel: klik = input, Enter/blur slaat op, Esc annuleert.
function EditableText({
  value,
  placeholder = "—",
  type = "text",
  bold = false,
  onSave,
}: {
  value: string | null;
  placeholder?: string;
  type?: "text" | "number";
  bold?: boolean;
  onSave: (v: string | null) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  function commit() {
    setEditing(false);
    const t = String(local).trim();
    if (t === (value ?? "")) return;
    void onSave(t === "" ? null : t);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setLocal(value ?? "");
            setEditing(false);
          }
        }}
        className="w-full rounded border border-[color:var(--orange)] bg-white px-1 py-0.5 text-xs outline-none"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full cursor-text truncate rounded text-left text-xs hover:bg-black/[0.03]",
        value
          ? bold
            ? "font-semibold text-[color:var(--navy)]"
            : "text-[color:var(--text-muted)]"
          : "text-[color:var(--text-soft)]",
      )}
      title={value ?? ""}
    >
      {value || placeholder}
    </button>
  );
}

// Bedrijfslogo via favicon-service op het domein; valt terug op een icoon.
function CompanyFavicon({
  domain,
  isProspect,
}: {
  domain: string | null;
  isProspect: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [domain]);

  if (domain && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domain)}`}
        alt=""
        width={16}
        height={16}
        loading="lazy"
        onError={() => setFailed(true)}
        className="size-4 shrink-0 rounded-sm"
      />
    );
  }
  const Icon = isProspect ? Building2 : User;
  return (
    <span className="grid size-4 shrink-0 place-items-center">
      <Icon
        className="size-3.5 text-[color:var(--text-soft)]"
        strokeWidth={1.8}
      />
    </span>
  );
}

// Type-icoon per kolom (Clay-stijl header). Verrijkings-kolommen krijgen ✦,
// numerieke #, de rest een tekst-icoon.
const ENRICHMENT_COLS = new Set([
  "niche",
  "industry",
  "companySize",
  "reach",
  "leadScore",
  "jobTitle",
  "seniority",
  "city",
  "companyName",
  "revenueRange",
]);
function columnIcon(col: string): typeof TypeIcon {
  if (col.startsWith("custom:")) return Sparkles;
  if (ENRICHMENT_COLS.has(col)) return Sparkles;
  if (col === "licenses" || col === "mails") return Hash;
  if (col === "mollie") return AtSign;
  if (
    col === "accountOwner" ||
    col === "discountCode" ||
    col === "companyDomain" ||
    col === "linkedinUrl"
  )
    return Link2;
  return TypeIcon;
}

/** Compacte volger-/bereik-notatie: 12500 → "12,5k". */
function formatReach(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}k`;
  return String(n);
}

/** Lead-score → kleur (rood laag → groen hoog). */
function scoreColor(score: number): string {
  if (score >= 75) return "var(--green-600, #16a34a)";
  if (score >= 50) return "var(--orange-600, #ea580c)";
  if (score >= 25) return "#ca8a04";
  return "#9ca3af";
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
  const [listType, setListType] = useState<"eindklant" | "reseller">("eindklant");
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
      body: JSON.stringify({ name, description, color, listType, isShared }),
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
        <div className="grid gap-1">
          <span className="text-xs font-semibold">Funnel</span>
          <div className="flex gap-2">
            {(
              [
                { key: "eindklant", label: "Eindklant prospects" },
                { key: "reseller", label: "Reseller prospects" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setListType(t.key)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold",
                  listType === t.key
                    ? "border-[color:var(--navy)] bg-[color:var(--navy)] text-white"
                    : "border-[color:var(--border-soft)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[0.6875rem] text-[color:var(--text-soft)]">
            Bepaalt op welk bord nieuwe contacten in deze lijst landen.
          </span>
        </div>
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

// Side-panel (geen modal): elke toggle of versleping werkt DIRECT door in de
// grid ernaast — de parent-state verandert meteen en de debounced prefs-effect
// persisteert. Geen Toepassen-knop meer nodig.
function ColumnManagerPanel({
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
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);

  const known = new Set(order);
  const fullOrder = [...order, ...allKeys.filter((c) => !known.has(c))];
  const visibleSet = new Set(visible);

  function toggle(col: string) {
    const next = new Set(visibleSet);
    if (next.has(col)) next.delete(col);
    else next.add(col);
    onChange(
      fullOrder.filter((c) => next.has(c)),
      fullOrder,
    );
  }

  function onDragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    if (!dragKey) return;
    const fromIdx = fullOrder.indexOf(dragKey);
    if (fromIdx === -1 || fromIdx === idx) return;
    const next = [...fullOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(idx, 0, moved);
    onChange(
      next.filter((c) => visibleSet.has(c)),
      next,
    );
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
    <aside className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-[color:var(--border-soft)] bg-white shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--border-soft)] px-4 py-3">
        <h2 className="text-base font-bold text-[color:var(--navy)]">
          Kolommen
        </h2>
        <button
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full hover:bg-[color:var(--bg)]"
          aria-label="Sluiten"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <p className="mb-3 text-xs text-[color:var(--text-muted)]">
        Elke wijziging is direct zichtbaar in de tabel. Toggle zichtbaarheid
        met het oog, sleep een rij om de volgorde te wijzigen. Auto-save naar
        je profiel.
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
        {fullOrder.map((col, idx) => {
          const isVisible = visibleSet.has(col);
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
    </aside>
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
