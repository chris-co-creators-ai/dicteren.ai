"use client";

import { useEffect, useState } from "react";
import {
  X,
  Save,
  Loader2,
  KeyRound,
  Check,
  Mail,
  Phone,
  MapPin,
  Video,
  Trash2,
  CalendarDays,
  Plus,
  MessageSquare,
} from "lucide-react";

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

type FullPartner = {
  id: string;
  externalId: string;
  organizationName: string;
  organizationType: string | null;
  priority: string | null;
  segment: string | null;
  whyRelevant: string | null;
  partnershipAngle: string | null;
  openingLine: string | null;
  offer: string | null;
  decisionMaker: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  contactUrl: string | null;
  accountOwner: string | null;
  outreachStatus: string | null;
  pilotStatus: string | null;
  lastContactDate: string | null;
  nextAction: string | null;
  followUpDate: string | null;
  responseSummary: string | null;
  freeCodesCount: number | null;
  gdprNotes: string | null;
};

type License = {
  id: string;
  code: string;
  status: string;
  seats: number;
  expiresAt: string | null;
};

type Task = {
  id: string;
  title: string;
  kind: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

type Comment = {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
};

const STAGES = ["Nieuw", "Benaderd", "In gesprek", "Akkoord", "Live", "Afgewezen"];
const PILOT_STAGES = ["Nog niet gestart", "In voorbereiding", "Live", "Geëvalueerd", "Beëindigd"];
const KINDS: Array<{ value: string; label: string; icon: typeof Mail }> = [
  { value: "email", label: "Mail sturen", icon: Mail },
  { value: "phone", label: "Bellen", icon: Phone },
  { value: "demo", label: "Demo afspraak", icon: Video },
  { value: "visit", label: "Op kantoor langs", icon: MapPin },
  { value: "follow_up", label: "Follow-up", icon: CalendarDays },
  { value: "other", label: "Anders", icon: MessageSquare },
];

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function PartnerSidePanel({
  orgId,
  onClose,
  onUpdated,
}: {
  orgId: string;
  onClose: () => void;
  onUpdated: (updates: Partial<Org>) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<FullPartner | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tab, setTab] = useState<"details" | "tasks" | "activity" | "license">(
    "details",
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/partners/${orgId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setPartner(data.partner);
          setLicense(data.license);
          setTasks(data.tasks);
          setComments(data.comments);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[color:var(--text-muted)]" />
          </div>
        ) : !partner ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            <p>Partner niet gevonden.</p>
            <button onClick={onClose} className="btn btn-secondary mt-4">
              Sluiten
            </button>
          </div>
        ) : (
          <>
            <header className="flex items-start justify-between border-b border-[color:var(--border-soft)] p-5">
              <div>
                <div className="font-mono text-[0.6875rem] text-[color:var(--text-muted)]">
                  {partner.externalId}
                </div>
                <h2 className="mt-0.5 text-lg font-bold leading-tight">
                  {partner.organizationName}
                </h2>
                <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {partner.city ?? "—"} · owner {partner.accountOwner ?? "—"}
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid size-9 place-items-center rounded-full hover:bg-[color:var(--surface-2)]"
              >
                <X className="size-4" />
              </button>
            </header>

            <nav className="flex border-b border-[color:var(--border-soft)] px-5">
              {([
                ["details", "Details"],
                ["tasks", `Taken (${tasks.filter((t) => t.status === "open").length})`],
                ["activity", "Activiteit"],
                ["license", license ? "Licentie ✓" : "Licentie geven"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative px-3 py-3 text-xs font-semibold ${
                    tab === key
                      ? "text-[color:var(--navy)]"
                      : "text-[color:var(--text-muted)]"
                  }`}
                >
                  {label}
                  {tab === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--orange)]" />
                  )}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === "details" && (
                <DetailsTab
                  partner={partner}
                  onSaved={(updated) => {
                    setPartner(updated);
                    onUpdated({
                      organizationName: updated.organizationName,
                      priority: updated.priority,
                      segment: updated.segment,
                      outreachStatus: updated.outreachStatus,
                      pilotStatus: updated.pilotStatus,
                      email: updated.email,
                      city: updated.city,
                      accountOwner: updated.accountOwner,
                      followUpDate: updated.followUpDate,
                    });
                  }}
                />
              )}
              {tab === "tasks" && (
                <TasksTab
                  orgId={partner.id}
                  tasks={tasks}
                  setTasks={setTasks}
                />
              )}
              {tab === "activity" && (
                <ActivityTab
                  orgId={partner.id}
                  comments={comments}
                  setComments={setComments}
                  tasks={tasks}
                />
              )}
              {tab === "license" && (
                <LicenseTab
                  orgId={partner.id}
                  license={license}
                  onIssued={(lic) => {
                    setLicense(lic);
                    onUpdated({
                      partnerCode: lic.code,
                      licenseStatus: lic.status,
                      freeCodesCount: lic.seats,
                      pilotStatus:
                        partner.pilotStatus === "Nog niet gestart"
                          ? "Live"
                          : partner.pilotStatus,
                    });
                  }}
                />
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* ─────────────────────────── DETAILS TAB ─────────────────────────── */

function DetailsTab({
  partner,
  onSaved,
}: {
  partner: FullPartner;
  onSaved: (p: FullPartner) => void;
}) {
  const [form, setForm] = useState<FullPartner>(partner);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FullPartner>(key: K, value: FullPartner[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Opslaan mislukt");
        setSaving(false);
        return;
      }
      onSaved({ ...form, ...data.partner });
      setSavedAt(new Date().toLocaleTimeString("nl-NL"));
    } catch {
      setError("Netwerkprobleem");
    }
    setSaving(false);
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Organisatie"
          value={form.organizationName}
          onChange={(v) => set("organizationName", v)}
        />
        <SelectField
          label="Type"
          value={form.organizationType ?? ""}
          onChange={(v) => set("organizationType", v || null)}
          options={[
            "",
            "stichting",
            "vereniging",
            "nonprofit",
            "onderwijs",
            "zorg",
            "overheid",
          ]}
        />
        <SelectField
          label="Prioriteit"
          value={form.priority ?? "B"}
          onChange={(v) => set("priority", v)}
          options={["A", "B", "C"]}
        />
        <Input
          label="Segment / doelgroep"
          value={form.segment ?? ""}
          onChange={(v) => set("segment", v || null)}
        />
        <SelectField
          label="Outreach status"
          value={form.outreachStatus ?? "Nieuw"}
          onChange={(v) => set("outreachStatus", v)}
          options={STAGES}
        />
        <SelectField
          label="Pilot status"
          value={form.pilotStatus ?? "Nog niet gestart"}
          onChange={(v) => set("pilotStatus", v)}
          options={PILOT_STAGES}
        />
        <Input
          label="Account-owner"
          value={form.accountOwner ?? ""}
          onChange={(v) => set("accountOwner", v || null)}
        />
        <Input
          label="Beslisser / contact"
          value={form.decisionMaker ?? ""}
          onChange={(v) => set("decisionMaker", v || null)}
        />
        <Input
          label="E-mail"
          type="email"
          value={form.email ?? ""}
          onChange={(v) => set("email", v || null)}
        />
        <Input
          label="Telefoon"
          value={form.phone ?? ""}
          onChange={(v) => set("phone", v || null)}
        />
        <Input
          label="Stad"
          value={form.city ?? ""}
          onChange={(v) => set("city", v || null)}
        />
        <Input
          label="Adres"
          value={form.address ?? ""}
          onChange={(v) => set("address", v || null)}
        />
        <Input
          label="Website"
          value={form.website ?? ""}
          onChange={(v) => set("website", v || null)}
        />
        <Input
          label="Contact-URL"
          value={form.contactUrl ?? ""}
          onChange={(v) => set("contactUrl", v || null)}
        />
        <Input
          label="Laatste contact (datum)"
          value={form.lastContactDate ?? ""}
          onChange={(v) => set("lastContactDate", v || null)}
          placeholder="2026-05-20"
        />
        <Input
          label="Follow-up datum"
          value={form.followUpDate ?? ""}
          onChange={(v) => set("followUpDate", v || null)}
          placeholder="2026-06-01"
        />
      </div>

      <Textarea
        label="Waarom relevant?"
        value={form.whyRelevant ?? ""}
        onChange={(v) => set("whyRelevant", v || null)}
      />
      <Textarea
        label="Partnership-angle"
        value={form.partnershipAngle ?? ""}
        onChange={(v) => set("partnershipAngle", v || null)}
      />
      <Textarea
        label="Opening-line"
        value={form.openingLine ?? ""}
        onChange={(v) => set("openingLine", v || null)}
      />
      <Textarea
        label="Aanbod"
        value={form.offer ?? ""}
        onChange={(v) => set("offer", v || null)}
      />
      <Textarea
        label="Volgende actie"
        value={form.nextAction ?? ""}
        onChange={(v) => set("nextAction", v || null)}
      />
      <Textarea
        label="Samenvatting reactie"
        value={form.responseSummary ?? ""}
        onChange={(v) => set("responseSummary", v || null)}
      />
      <Textarea
        label="AVG / privacy notities"
        value={form.gdprNotes ?? ""}
        onChange={(v) => set("gdprNotes", v || null)}
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-end gap-3 border-t border-[color:var(--border-soft)] bg-white px-5 py-3">
        {savedAt && (
          <span className="inline-flex items-center gap-1 text-xs text-green-700">
            <Check className="size-3" />
            Opgeslagen om {savedAt}
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="btn btn-primary disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Opslaan
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── TASKS TAB ─────────────────────────── */

function TasksTab({
  orgId,
  tasks,
  setTasks,
}: {
  orgId: string;
  tasks: Task[];
  setTasks: (t: Task[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("phone");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${orgId}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          kind,
          dueDate: dueDate ? `${dueDate}T09:00:00` : null,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks([data.task, ...tasks]);
        setTitle("");
        setDueDate("");
        setNotes("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggle(taskId: string, status: "open" | "done") {
    const next = status === "open" ? "done" : "open";
    const res = await fetch(`/api/admin/partners/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (data.success) {
      setTasks(tasks.map((t) => (t.id === taskId ? data.task : t)));
    }
  }

  async function remove(taskId: string) {
    if (!confirm("Taak verwijderen?")) return;
    const res = await fetch(`/api/admin/partners/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (res.ok) setTasks(tasks.filter((t) => t.id !== taskId));
  }

  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
        <div className="text-xs font-bold uppercase">Nieuwe taak</div>
        <div className="mt-2 grid gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bv. Bellen over pilot, mail intake-document sturen, demo plannen"
            className="w-full rounded border border-[color:var(--border-soft)] px-2 py-1.5 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded border border-[color:var(--border-soft)] px-2 py-1.5 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded border border-[color:var(--border-soft)] px-2 py-1.5 text-sm"
            />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Extra notitie (optioneel)"
            rows={2}
            className="w-full rounded border border-[color:var(--border-soft)] px-2 py-1.5 text-xs"
          />
          <button
            onClick={addTask}
            disabled={saving || !title.trim()}
            className="btn btn-primary justify-self-start disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            Taak toevoegen
          </button>
        </div>
      </section>

      <section>
        <div className="text-xs font-bold uppercase">
          Openstaand ({open.length})
        </div>
        {open.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-[color:var(--border-soft)] p-4 text-center text-xs text-[color:var(--text-muted)]">
            Geen openstaande taken.
          </div>
        ) : (
          <ul className="mt-2 grid gap-2">
            {open.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => toggle(t.id, "open")}
                onDelete={() => remove(t.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <div className="text-xs font-bold uppercase text-[color:var(--text-muted)]">
            Afgerond ({done.length})
          </div>
          <ul className="mt-2 grid gap-2">
            {done.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => toggle(t.id, "done")}
                onDelete={() => remove(t.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const kind = KINDS.find((k) => k.value === task.kind) ?? KINDS[KINDS.length - 1];
  const Icon = kind.icon;
  const isDone = task.status === "done";
  const isOverdue =
    !isDone &&
    task.dueDate !== null &&
    new Date(task.dueDate).getTime() < Date.now();

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        isOverdue
          ? "border-red-200 bg-red-50/40"
          : "border-[color:var(--border-soft)] bg-white"
      }`}
    >
      <button
        onClick={onToggle}
        className={`grid size-5 shrink-0 place-items-center rounded border ${
          isDone
            ? "border-green-600 bg-green-600 text-white"
            : "border-[color:var(--border-soft)] hover:border-[color:var(--orange)]"
        }`}
      >
        {isDone && <Check className="size-3" strokeWidth={3} />}
      </button>
      <div className="flex-1">
        <div
          className={`flex items-center gap-2 text-sm font-semibold ${
            isDone ? "text-[color:var(--text-muted)] line-through" : ""
          }`}
        >
          <Icon className="size-3.5 text-[color:var(--text-muted)]" />
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.6875rem] text-[color:var(--text-muted)]">
          <span>{kind.label}</span>
          {task.dueDate && (
            <span
              className={isOverdue ? "font-bold text-red-700" : undefined}
            >
              · {fmtDate(task.dueDate)} {isOverdue && "(verlopen)"}
            </span>
          )}
        </div>
        {task.notes && (
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            {task.notes}
          </p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="grid size-7 place-items-center rounded-full hover:bg-red-50"
      >
        <Trash2 className="size-3 text-red-600" />
      </button>
    </li>
  );
}

/* ─────────────────────────── ACTIVITY TAB ─────────────────────────── */

function ActivityTab({
  orgId,
  comments,
  setComments,
  tasks,
}: {
  orgId: string;
  comments: Comment[];
  setComments: (c: Comment[]) => void;
  tasks: Task[];
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/partners/${orgId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (data.success) {
        setComments([data.comment, ...comments]);
        setText("");
      }
    } finally {
      setSaving(false);
    }
  }

  // Combineer comments + afgeronde tasks tot een gemerged log.
  const merged: Array<
    | { type: "comment"; data: Comment }
    | { type: "task"; data: Task }
  > = [
    ...comments.map((c) => ({ type: "comment" as const, data: c })),
    ...tasks
      .filter((t) => t.completedAt)
      .map((t) => ({ type: "task" as const, data: t })),
  ].sort((a, b) => {
    const ta =
      a.type === "comment" ? a.data.createdAt : a.data.completedAt ?? "";
    const tb =
      b.type === "comment" ? b.data.createdAt : b.data.completedAt ?? "";
    return tb.localeCompare(ta);
  });

  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3">
        <div className="text-xs font-bold uppercase">Notitie / status</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Bv. 'Gebeld met Hans, wil eerst pilot van 50 codes voor 3 maanden testen'"
          rows={3}
          className="mt-2 w-full rounded border border-[color:var(--border-soft)] p-2 text-sm"
        />
        <button
          onClick={add}
          disabled={saving || !text.trim()}
          className="btn btn-primary mt-2 disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          Toevoegen
        </button>
      </section>

      <section className="grid gap-2">
        {merged.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[color:var(--border-soft)] p-4 text-center text-xs text-[color:var(--text-muted)]">
            Nog geen activiteit.
          </div>
        ) : (
          merged.map((entry) =>
            entry.type === "comment" ? (
              <div
                key={`c-${entry.data.id}`}
                className="rounded-lg border border-[color:var(--border-soft)] bg-white p-3"
              >
                <div className="flex items-center justify-between text-[0.6875rem] text-[color:var(--text-muted)]">
                  <span>
                    <MessageSquare className="mr-1 inline size-3" />
                    {entry.data.authorName ?? "—"}
                  </span>
                  <span>{fmtDateTime(entry.data.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {entry.data.body}
                </p>
              </div>
            ) : (
              <div
                key={`t-${entry.data.id}`}
                className="rounded-lg border border-green-200 bg-green-50/40 p-3"
              >
                <div className="flex items-center justify-between text-[0.6875rem] text-[color:var(--text-muted)]">
                  <span>
                    <Check className="mr-1 inline size-3 text-green-700" />
                    Taak afgerond
                  </span>
                  <span>{fmtDateTime(entry.data.completedAt)}</span>
                </div>
                <p className="mt-1 text-sm">{entry.data.title}</p>
              </div>
            ),
          )
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────── LICENSE TAB ─────────────────────────── */

function LicenseTab({
  orgId,
  license,
  onIssued,
}: {
  orgId: string;
  license: License | null;
  onIssued: (lic: License) => void;
}) {
  const [months, setMonths] = useState(12);
  const [seats, setSeats] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/partners/${orgId}/issue-code`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ months, seats }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Code aanmaken mislukt");
        setSaving(false);
        return;
      }
      onIssued({
        id: orgId,
        code: data.code,
        status: data.status,
        seats: data.seats,
        expiresAt: data.expiresAt,
      });
    } catch {
      setError("Netwerkprobleem");
    }
    setSaving(false);
  }

  if (license) {
    return (
      <div className="grid gap-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="text-[0.6875rem] font-bold uppercase text-green-800">
            Actieve partner-code
          </div>
          <div className="mt-2 break-all font-mono text-lg font-bold text-green-900">
            {license.code}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-green-800">
            <div>
              <span className="opacity-70">Status:</span> {license.status}
            </div>
            <div>
              <span className="opacity-70">Seats:</span> {license.seats}
            </div>
            <div className="col-span-2">
              <span className="opacity-70">Verloopt:</span>{" "}
              {license.expiresAt ? fmtDate(license.expiresAt) : "Lifetime"}
            </div>
          </div>
        </div>
        <p className="text-xs text-[color:var(--text-muted)]">
          Eén partner-code per organisatie. Een nieuwe code aanmaken kan niet
          zolang deze code actief is — neem contact op met een admin om te
          revoken als dat nodig is.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs text-[color:var(--text-muted)]">
        Maak één gedeelde licentiecode voor de achterban van deze partner.
        Geldigheid in maanden (0 = lifetime); seats = max gelijktijdige
        gebruikers.
      </p>
      <div className="grid gap-3">
        <Input
          label="Geldigheid (maanden, 0 = lifetime)"
          type="number"
          value={String(months)}
          onChange={(v) => setMonths(Math.max(0, +v || 0))}
        />
        <Input
          label="Seats"
          type="number"
          value={String(seats)}
          onChange={(v) => setSeats(Math.max(1, +v || 1))}
        />
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        onClick={submit}
        disabled={saving}
        className="btn btn-primary disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <KeyRound className="size-3.5" />
        )}
        Code aanmaken
      </button>
    </div>
  );
}

/* ─────────────────────────── ATOMS ─────────────────────────── */

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-[color:var(--border-soft)] px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="rounded border border-[color:var(--border-soft)] px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function SelectField({
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
    <label className="grid gap-1">
      <span className="text-xs font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-[color:var(--border-soft)] px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}
