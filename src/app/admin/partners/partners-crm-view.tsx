"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ExternalLink,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Upload,
  KeyRound,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { issuePartnerCodeAction } from "./[id]/actions";

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

const STAGES = [
  "Nieuw",
  "Benaderd",
  "In gesprek",
  "Akkoord",
  "Live",
  "Afgewezen",
] as const;
type Stage = (typeof STAGES)[number];

const PRIORITY_LABEL: Record<string, string> = {
  A: "A · hoog",
  B: "B · medium",
  C: "C · laag",
};

export function PartnersCrmView({
  orgs: initial,
  kpis,
  currentUserName,
}: {
  orgs: Org[];
  kpis: Kpis;
  currentUserName: string;
}) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>(initial);
  const [view, setView] = useState<"table" | "kanban">("kanban");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [priorityFilter, setPriorityFilter] = useState("Alle");
  const [showCreate, setShowCreate] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [codeOrg, setCodeOrg] = useState<Org | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return orgs.filter((o) => {
      if (statusFilter !== "Alle" && o.outreachStatus !== statusFilter)
        return false;
      if (priorityFilter !== "Alle" && o.priority !== priorityFilter)
        return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = [
          o.organizationName,
          o.segment ?? "",
          o.city ?? "",
          o.email ?? "",
          o.partnerCode ?? "",
          o.accountOwner ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orgs, query, statusFilter, priorityFilter]);

  async function moveOrgToStage(orgId: string, newStage: Stage) {
    const prev = orgs.find((o) => o.id === orgId)?.outreachStatus ?? null;
    setOrgs((cur) =>
      cur.map((o) => (o.id === orgId ? { ...o, outreachStatus: newStage } : o)),
    );
    try {
      const res = await fetch(`/api/admin/partners/${orgId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outreachStatus: newStage }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Update mislukt");
      startTransition(() => router.refresh());
    } catch (err) {
      // Rollback
      setOrgs((cur) =>
        cur.map((o) =>
          o.id === orgId ? { ...o, outreachStatus: prev } : o,
        ),
      );
      alert(
        err instanceof Error ? err.message : "Kon stage niet bijwerken",
      );
    }
  }

  function onCreated(row: Org) {
    setOrgs((cur) => [row, ...cur]);
    setShowCreate(false);
    startTransition(() => router.refresh());
  }

  function onBulkImported() {
    setShowCsv(false);
    startTransition(() => router.refresh());
  }

  function onCodeIssued(orgId: string, code: string, seats: number) {
    setOrgs((cur) =>
      cur.map((o) =>
        o.id === orgId
          ? {
              ...o,
              partnerCode: code,
              licenseStatus: "active",
              freeCodesCount: seats,
              pilotStatus:
                o.pilotStatus === "Nog niet gestart" ? "Live" : o.pilotStatus,
            }
          : o,
      ),
    );
    setCodeOrg(null);
    startTransition(() => router.refresh());
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Maatschappelijke partners
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Outreach naar stichtingen en non-profits voor gratis codes aan hun
            achterban (dyslexie, hoorbeperking, motorische beperking).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCsv(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[color:var(--surface-2)]"
          >
            <Upload className="size-3.5" strokeWidth={2.2} />
            CSV import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--orange)] px-3 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            <Plus className="size-3.5" strokeWidth={2.4} />
            Nieuwe partner
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Kpi
          label="Organisaties"
          value={kpis.total}
          sublabel={`${kpis.perStatus.Nieuw ?? 0} nieuw · ${kpis.perStatus.Live ?? 0} live`}
        />
        <Kpi
          label="Actieve codes"
          value={kpis.activeCodes}
          sublabel="uitgegeven & actief"
        />
        <Kpi
          label="Activaties totaal"
          value={kpis.totalActivations}
          sublabel={`${kpis.activeActivations} nu actief`}
          accent
        />
        <Kpi
          label="Activaties 7d / 30d"
          value={kpis.last7DaysActivations}
          sublabel={`${kpis.last30DaysActivations} laatste 30 dagen`}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border-soft)] bg-white p-3">
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border-soft)] px-3">
          <Search className="size-3.5 text-[color:var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek organisatie, code, stad, account-owner..."
            className="h-9 w-72 bg-transparent text-sm outline-none"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={["Alle", ...STAGES]}
          label="Stage"
        />
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={["Alle", "A", "B", "C"]}
          label="Prioriteit"
        />

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[color:var(--text-muted)]">
            {filtered.length} van {orgs.length}
          </span>
          <div className="flex rounded-lg border border-[color:var(--border-soft)] p-0.5">
            <button
              onClick={() => setView("kanban")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                view === "kanban"
                  ? "bg-[color:var(--navy)] text-white"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              <LayoutGrid className="size-3" />
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                view === "table"
                  ? "bg-[color:var(--navy)] text-white"
                  : "text-[color:var(--text-muted)]"
              }`}
            >
              <TableIcon className="size-3" />
              Tabel
            </button>
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard
          orgs={filtered}
          onMove={moveOrgToStage}
          onCodeClick={setCodeOrg}
        />
      ) : (
        <TableView
          orgs={filtered}
          allCount={orgs.length}
          onCodeClick={setCodeOrg}
          onCreated={onCreated}
          currentUserName={currentUserName}
        />
      )}

      {showCreate && (
        <CreatePartnerModal
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
          currentUserName={currentUserName}
        />
      )}
      {showCsv && (
        <CsvImportModal
          onClose={() => setShowCsv(false)}
          onImported={onBulkImported}
        />
      )}
      {codeOrg && (
        <IssueCodeModal
          org={codeOrg}
          onClose={() => setCodeOrg(null)}
          onIssued={(code, seats) => onCodeIssued(codeOrg.id, code, seats)}
        />
      )}
    </main>
  );
}

/* ─────────────────────────── KANBAN ─────────────────────────── */

function KanbanBoard({
  orgs,
  onMove,
  onCodeClick,
}: {
  orgs: Org[];
  onMove: (orgId: string, stage: Stage) => void;
  onCodeClick: (o: Org) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const byStage = useMemo(() => {
    const m = new Map<Stage, Org[]>();
    STAGES.forEach((s) => m.set(s, []));
    for (const o of orgs) {
      const s = (o.outreachStatus ?? "Nieuw") as Stage;
      if (!m.has(s)) m.set(s, []);
      m.get(s)!.push(o);
    }
    return m;
  }, [orgs]);

  return (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-3">
      {STAGES.map((stage) => {
        const items = byStage.get(stage) ?? [];
        const isOver = dragOver === stage;
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(stage);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              if (dragId) onMove(dragId, stage);
              setDragId(null);
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl border bg-white p-3 ${
              isOver
                ? "border-[color:var(--orange)] bg-orange-50/40"
                : "border-[color:var(--border-soft)]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[color:var(--border-soft)] pb-2">
              <span className="text-xs font-bold uppercase tracking-wide">
                {stage}
              </span>
              <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
                {items.length}
              </span>
            </div>
            <div className="mt-2 flex flex-1 flex-col gap-2 overflow-y-auto">
              {items.map((o) => (
                <KanbanCard
                  key={o.id}
                  org={o}
                  onDragStart={() => setDragId(o.id)}
                  onCodeClick={() => onCodeClick(o)}
                />
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] p-3 text-center text-[0.6875rem] text-[color:var(--text-muted)]">
                  Sleep een partner hierheen
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  org,
  onDragStart,
  onCodeClick,
}: {
  org: Org;
  onDragStart: () => void;
  onCodeClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-lg border border-[color:var(--border-soft)] bg-white p-3 text-xs shadow-sm hover:border-[color:var(--orange)] active:cursor-grabbing"
    >
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={`/admin/partners/${org.id}`}
          className="font-semibold leading-snug hover:underline"
        >
          {org.organizationName}
        </Link>
        <PriorityPill priority={org.priority} compact />
      </div>
      <div className="mt-1 text-[0.6875rem] text-[color:var(--text-muted)]">
        {org.city ?? "—"} {org.segment ? `· ${org.segment}` : ""}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[0.6875rem] text-[color:var(--text-muted)]">
          {org.accountOwner ?? "Geen owner"}
        </span>
        {org.partnerCode ? (
          <code className="rounded bg-[color:var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.625rem]">
            {org.partnerCode.slice(0, 12)}…
          </code>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCodeClick();
            }}
            className="inline-flex items-center gap-0.5 rounded bg-[color:var(--orange)] px-1.5 py-0.5 text-[0.625rem] font-bold text-white"
          >
            <KeyRound className="size-2.5" />
            Code geven
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── TABLE ─────────────────────────── */

function TableView({
  orgs,
  allCount,
  onCodeClick,
  onCreated,
  currentUserName,
}: {
  orgs: Org[];
  allCount: number;
  onCodeClick: (o: Org) => void;
  onCreated: (row: Org) => void;
  currentUserName: string;
}) {
  const [addingInline, setAddingInline] = useState(false);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--border-soft)] bg-white">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--surface-2)] text-left text-[0.6875rem] uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Organisatie</th>
            <th className="px-4 py-3">Pri</th>
            <th className="px-4 py-3">Segment</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Pilot</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Activaties</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border-soft)]">
          {addingInline && (
            <InlineAddRow
              currentUserName={currentUserName}
              onCancel={() => setAddingInline(false)}
              onCreated={(r) => {
                onCreated(r);
                setAddingInline(false);
              }}
            />
          )}
          {!addingInline && (
            <tr className="bg-[color:var(--surface-2)]/40 hover:bg-[color:var(--surface-2)]">
              <td colSpan={10} className="px-4 py-2">
                <button
                  onClick={() => setAddingInline(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--orange-600)]"
                >
                  <Plus className="size-3" /> Nieuwe partner inline toevoegen
                </button>
              </td>
            </tr>
          )}
          {orgs.map((o) => (
            <tr key={o.id} className="hover:bg-[color:var(--surface-2)]">
              <td className="px-4 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                {o.externalId}
              </td>
              <td className="px-4 py-3 font-medium">
                <div>{o.organizationName}</div>
                {o.city && (
                  <div className="text-xs text-[color:var(--text-muted)]">
                    {o.city}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <PriorityPill priority={o.priority} />
              </td>
              <td className="px-4 py-3 text-xs text-[color:var(--text-muted)]">
                {o.segment ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs">{o.accountOwner ?? "—"}</td>
              <td className="px-4 py-3">
                <StatusPill status={o.outreachStatus} />
              </td>
              <td className="px-4 py-3 text-xs">{o.pilotStatus}</td>
              <td className="px-4 py-3">
                {o.partnerCode ? (
                  <code className="font-mono text-xs">{o.partnerCode}</code>
                ) : (
                  <button
                    onClick={() => onCodeClick(o)}
                    className="inline-flex items-center gap-0.5 rounded bg-[color:var(--orange)] px-1.5 py-0.5 text-[0.625rem] font-bold text-white"
                  >
                    <KeyRound className="size-2.5" />
                    Geven
                  </button>
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
      {orgs.length === 0 && !addingInline && (
        <div className="px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
          Geen partners met deze filters ({allCount} totaal).
        </div>
      )}
    </div>
  );
}

function InlineAddRow({
  currentUserName,
  onCancel,
  onCreated,
}: {
  currentUserName: string;
  onCancel: () => void;
  onCreated: (row: Org) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [segment, setSegment] = useState("");
  const [priority, setPriority] = useState("B");
  const [stage, setStage] = useState<Stage>("Nieuw");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationName: name,
          city,
          email,
          segment,
          priority,
          outreachStatus: stage,
          accountOwner: currentUserName,
        }),
      });
      const data = await res.json();
      if (data.success && data.partner) {
        onCreated({
          id: data.partner.id,
          externalId: data.partner.externalId,
          organizationName: data.partner.organizationName,
          priority: data.partner.priority,
          segment: data.partner.segment,
          outreachStatus: data.partner.outreachStatus,
          pilotStatus: data.partner.pilotStatus,
          email: data.partner.email,
          city: data.partner.city,
          accountOwner: data.partner.accountOwner,
          followUpDate: data.partner.followUpDate,
          freeCodesCount: data.partner.freeCodesCount,
          partnerCode: null,
          licenseStatus: null,
          activeActivations: 0,
        });
      } else {
        alert(data.error ?? "Aanmaken mislukt");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="bg-orange-50/40">
      <td className="px-4 py-2 text-xs text-[color:var(--text-muted)]">auto</td>
      <td className="px-4 py-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Stichting Naam"
          className="w-full rounded border border-[color:var(--border-soft)] px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded border border-[color:var(--border-soft)] px-1 py-1 text-xs"
        >
          <option>A</option>
          <option>B</option>
          <option>C</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <input
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          placeholder="dyslexie / hoor / motorisch"
          className="w-full rounded border border-[color:var(--border-soft)] px-2 py-1 text-xs"
        />
      </td>
      <td className="px-4 py-2 text-xs">{currentUserName}</td>
      <td className="px-4 py-2">
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage)}
          className="rounded border border-[color:var(--border-soft)] px-1 py-1 text-xs"
        >
          {STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-xs text-[color:var(--text-muted)]">—</td>
      <td className="px-4 py-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="stad"
          className="w-24 rounded border border-[color:var(--border-soft)] px-2 py-1 text-xs"
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@…"
          className="w-full rounded border border-[color:var(--border-soft)] px-2 py-1 text-xs"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button
            disabled={saving || !name.trim()}
            onClick={submit}
            className="rounded bg-[color:var(--green)] p-1 text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-[color:var(--border-soft)] p-1"
          >
            <X className="size-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────── MODALS ─────────────────────────── */

function CreatePartnerModal({
  onClose,
  onCreated,
  currentUserName,
}: {
  onClose: () => void;
  onCreated: (row: Org) => void;
  currentUserName: string;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [segment, setSegment] = useState("");
  const [organizationType, setOrganizationType] = useState("stichting");
  const [decisionMaker, setDecisionMaker] = useState("");
  const [whyRelevant, setWhyRelevant] = useState("");
  const [priority, setPriority] = useState("B");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationName: name,
          city,
          email,
          phone,
          website,
          segment,
          organizationType,
          decisionMaker,
          whyRelevant,
          priority,
          accountOwner: currentUserName,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Aanmaken mislukt");
        setSaving(false);
        return;
      }
      onCreated({
        id: data.partner.id,
        externalId: data.partner.externalId,
        organizationName: data.partner.organizationName,
        priority: data.partner.priority,
        segment: data.partner.segment,
        outreachStatus: data.partner.outreachStatus,
        pilotStatus: data.partner.pilotStatus,
        email: data.partner.email,
        city: data.partner.city,
        accountOwner: data.partner.accountOwner,
        followUpDate: data.partner.followUpDate,
        freeCodesCount: data.partner.freeCodesCount,
        partnerCode: null,
        licenseStatus: null,
        activeActivations: 0,
      });
    } catch {
      setError("Netwerkprobleem");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <h2 className="text-xl font-bold">Nieuwe maatschappelijke partner</h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Stichting, non-profit of maatschappelijke organisatie die wij gaan
          contacteren. Account-owner is standaard {currentUserName}.
        </p>

        <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Organisatie *" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Stichting Lezen & Schrijven"
            />
          </Field>
          <Field label="Type">
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
              className="input"
            >
              <option value="stichting">Stichting</option>
              <option value="vereniging">Vereniging</option>
              <option value="nonprofit">Non-profit</option>
              <option value="onderwijs">Onderwijsinstelling</option>
              <option value="zorg">Zorgorganisatie</option>
              <option value="overheid">Overheid</option>
            </select>
          </Field>
          <Field label="Doelgroep / segment">
            <input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="input"
              placeholder="dyslexie, hoorbeperking, motorisch, cognitief"
            />
          </Field>
          <Field label="Prioriteit">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input"
            >
              <option value="A">A — hoog</option>
              <option value="B">B — medium</option>
              <option value="C">C — laag</option>
            </select>
          </Field>
          <Field label="Beslisser / contactpersoon">
            <input
              value={decisionMaker}
              onChange={(e) => setDecisionMaker(e.target.value)}
              className="input"
              placeholder="Voornaam Achternaam"
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="contact@stichting.nl"
            />
          </Field>
          <Field label="Telefoon">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Stad">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Website">
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="input"
              placeholder="https://"
            />
          </Field>
          <Field label="Waarom relevant?" full>
            <textarea
              value={whyRelevant}
              onChange={(e) => setWhyRelevant(e.target.value)}
              rows={2}
              className="input"
              placeholder="Bv. 15.000 mensen met dyslexie in hun achterban die baat hebben bij dicteren in plaats van typen."
            />
          </Field>

          {error && (
            <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Annuleer
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn btn-primary disabled:opacity-50"
            >
              {saving ? "Aanmaken…" : "Partner aanmaken"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CsvImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<
    Array<Record<string, string>> | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parsePreview() {
    setError(null);
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setError("CSV heeft een header-regel + minstens één data-regel nodig.");
      return;
    }
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim());
      const r: Record<string, string> = {};
      headers.forEach((h, idx) => {
        r[h] = vals[idx] ?? "";
      });
      rows.push(r);
    }
    setPreview(rows.slice(0, 200));
  }

  async function submit() {
    if (!preview || preview.length === 0) return;
    setSaving(true);
    setError(null);

    const mapped = preview
      .filter((r) => r.organisatie || r.naam || r.name)
      .map((r) => ({
        organizationName: r.organisatie || r.naam || r.name || "",
        city: r.stad || r.city || "",
        email: r.email || r.mail || "",
        phone: r.telefoon || r.phone || "",
        website: r.website || r.url || "",
        segment: r.segment || r.doelgroep || "",
        priority: (r.prioriteit || r.priority || "B").toUpperCase(),
        organizationType: r.type || "",
        decisionMaker: r.contact || r.contactpersoon || "",
        whyRelevant: r.waaromrelevant || r.reden || "",
      }));

    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows: mapped, organizationName: "bulk" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Import mislukt");
        setSaving(false);
        return;
      }
      onImported();
    } catch {
      setError("Netwerkprobleem");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <h2 className="text-xl font-bold">CSV import</h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Plak CSV-data hieronder. Header-regel verplicht. Herkende kolommen:
          organisatie, type, segment, prioriteit, contact, email, telefoon,
          stad, website, reden.
        </p>

        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={8}
          placeholder={
            "organisatie,type,segment,prioriteit,contact,email,stad\nStichting X,stichting,dyslexie,A,Jan Jansen,jan@x.nl,Amsterdam"
          }
          className="mt-4 w-full rounded-lg border border-[color:var(--border-soft)] p-3 font-mono text-xs"
        />

        <div className="mt-3 flex justify-between">
          <button onClick={parsePreview} className="btn btn-secondary">
            Voorbeeld bekijken
          </button>
          <span className="text-xs text-[color:var(--text-muted)]">
            {preview ? `${preview.length} rijen klaar` : "Nog niets geparsed"}
          </span>
        </div>

        {preview && preview.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[color:var(--border-soft)]">
            <table className="w-full text-xs">
              <thead className="bg-[color:var(--surface-2)] text-left">
                <tr>
                  {Object.keys(preview[0]).map((k) => (
                    <th key={k} className="px-2 py-1 font-semibold">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t">
                    {Object.keys(preview[0]).map((k) => (
                      <td key={k} className="px-2 py-1">
                        {r[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <div className="p-2 text-center text-[0.6875rem] text-[color:var(--text-muted)]">
                + {preview.length - 10} meer
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            Annuleer
          </button>
          <button
            onClick={submit}
            disabled={!preview || preview.length === 0 || saving}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving
              ? "Importeren…"
              : `Importeer ${preview?.length ?? 0} partners`}
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueCodeModal({
  org,
  onClose,
  onIssued,
}: {
  org: Org;
  onClose: () => void;
  onIssued: (code: string, seats: number) => void;
}) {
  const [months, setMonths] = useState(12);
  const [seats, setSeats] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const expiresAt =
      months > 0
        ? new Date(Date.now() + months * 30 * 24 * 3600 * 1000).toISOString()
        : null;
    try {
      const res = await issuePartnerCodeAction({
        partnerOrgId: org.id,
        seats,
        expiresAt,
      });
      if (!res.success) {
        setError(res.error ?? "Code aanmaken mislukt");
        setSaving(false);
        return;
      }
      setResult(res.code);
      onIssued(res.code, seats);
    } catch {
      setError("Netwerkprobleem");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <h2 className="text-xl font-bold">Licentiecode geven</h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Voor {org.organizationName} en hun achterban. Eén gedeelde code voor
          de hele organisatie.
        </p>

        {result ? (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="text-xs font-semibold uppercase text-green-800">
              Code aangemaakt
            </div>
            <div className="mt-2 break-all font-mono text-lg font-bold text-green-900">
              {result}
            </div>
            <p className="mt-2 text-xs text-green-800">
              Geef deze code door aan {org.organizationName}. Hun achterban kan
              ermee de Dicteren-app activeren.
            </p>
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="btn btn-primary">
                Klaar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            <Field label="Geldigheid (maanden, 0 = lifetime)">
              <input
                type="number"
                min={0}
                max={120}
                value={months}
                onChange={(e) => setMonths(Math.max(0, +e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Seats (max gelijktijdige gebruikers)">
              <input
                type="number"
                min={1}
                max={10000}
                value={seats}
                onChange={(e) => setSeats(Math.max(1, +e.target.value))}
                className="input"
              />
            </Field>
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="btn btn-secondary">
                Annuleer
              </button>
              <button
                disabled={saving}
                onClick={submit}
                className="btn btn-primary disabled:opacity-50"
              >
                {saving ? "Aanmaken…" : "Code aanmaken"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── ATOMS ─────────────────────────── */

function Field({
  label,
  children,
  full,
  required,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  required?: boolean;
}) {
  return (
    <label className={`grid gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
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
  options: readonly string[] | string[];
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

function PriorityPill({
  priority,
  compact,
}: {
  priority: string | null;
  compact?: boolean;
}) {
  if (!priority)
    return <span className="text-xs text-[color:var(--text-muted)]">—</span>;
  const colors: Record<string, { bg: string; text: string }> = {
    A: {
      bg: "color-mix(in srgb, var(--orange) 12%, white)",
      text: "var(--orange-600)",
    },
    B: {
      bg: "color-mix(in srgb, var(--aqua) 14%, white)",
      text: "var(--navy)",
    },
    C: { bg: "var(--bg-deep)", text: "var(--text-muted)" },
  };
  const c = colors[priority] ?? colors.C;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {compact ? priority : (PRIORITY_LABEL[priority] ?? priority)}
    </span>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const colors: Record<string, { bg: string; text: string }> = {
    Nieuw: { bg: "var(--bg-deep)", text: "var(--text-muted)" },
    Benaderd: {
      bg: "color-mix(in srgb, var(--aqua) 14%, white)",
      text: "var(--navy)",
    },
    "In gesprek": {
      bg: "color-mix(in srgb, var(--aqua) 20%, white)",
      text: "var(--navy)",
    },
    Akkoord: {
      bg: "color-mix(in srgb, var(--green) 14%, white)",
      text: "var(--green)",
    },
    Live: {
      bg: "color-mix(in srgb, var(--green) 18%, white)",
      text: "var(--green)",
    },
    Afgewezen: {
      bg: "color-mix(in srgb, var(--red) 12%, white)",
      text: "var(--red)",
    },
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
