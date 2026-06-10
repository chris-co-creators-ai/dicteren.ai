"use client";

// Dicteren.ai — /admin/taken client-view.
//
// Filtert op actie (taak-kind/dispositie) + datum, en groepeert open taken:
// "Zonder datum" staat helemaal bovenaan (elke taak hoort een vervaldatum te
// hebben voor opvolging — daar zit een inline datum-zetter op), daarna
// Verlopen, Vandaag, Morgen en Later (oplopend op datum). Complete-checkbox
// + "open taak" → de juiste organisatie.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarOff,
  Check,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Sun,
  Sunrise,
  Video,
} from "lucide-react";
import { dispositionLabel } from "@/lib/services/crmCallDisposition";

type Task = {
  taskId: string;
  title: string;
  kind: string;
  dueAt: string | null;
  notes: string | null;
  orgId: string;
  orgName: string;
};

const KIND_ICON: Record<string, typeof Mail> = {
  call: Phone,
  phone: Phone,
  email: Mail,
  meeting: Video,
  demo: Video,
  visit: MapPin,
  follow_up: CalendarDays,
  linkedin: MessageSquare,
  other: MessageSquare,
};

// Labels voor handmatige taak-kinds; dispositie-kinds (no_answer, gatekeeper…)
// krijgen hun label uit de SSOT via dispositionLabel().
const MANUAL_KIND_LABELS: Record<string, string> = {
  follow_up: "Opvolgen",
  email: "E-mail",
  phone: "Bellen",
  call: "Bellen",
  demo: "Demo",
  meeting: "Afspraak",
  visit: "Bezoek",
  linkedin: "LinkedIn",
  other: "Anders",
};

function kindLabel(kind: string): string {
  return MANUAL_KIND_LABELS[kind] ?? dispositionLabel(kind);
}

type DateFilter = "all" | "none" | "overdue" | "today" | "tomorrow" | "week";

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Alle datums" },
  { value: "none", label: "Zonder datum" },
  { value: "overdue", label: "Verlopen" },
  { value: "today", label: "Vandaag" },
  { value: "tomorrow", label: "Morgen" },
  { value: "week", label: "Komende 7 dagen" },
];

export function TakenView({ tasks }: { tasks: Task[] }) {
  const [kindFilter, setKindFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  // Kind-opties: alleen kinds die in de huidige takenlijst voorkomen.
  const kindOptions = useMemo(() => {
    const seen = new Map<string, number>();
    for (const t of tasks) seen.set(t.kind, (seen.get(t.kind) ?? 0) + 1);
    return [...seen.entries()]
      .map(([kind, count]) => ({ kind, count, label: kindLabel(kind) }))
      .sort((a, b) => a.label.localeCompare(b.label, "nl"));
  }, [tasks]);

  const { noDate, overdue, today, tomorrow, later } = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startTomorrow = new Date(startToday);
    startTomorrow.setDate(startTomorrow.getDate() + 1);
    const startDayAfter = new Date(startToday);
    startDayAfter.setDate(startDayAfter.getDate() + 2);
    const startNextWeek = new Date(startToday);
    startNextWeek.setDate(startNextWeek.getDate() + 7);

    function inDateFilter(t: Task): boolean {
      if (dateFilter === "all") return true;
      if (dateFilter === "none") return !t.dueAt;
      if (!t.dueAt) return false;
      const due = new Date(t.dueAt).getTime();
      switch (dateFilter) {
        case "overdue":
          return due < startToday.getTime();
        case "today":
          return due >= startToday.getTime() && due < startTomorrow.getTime();
        case "tomorrow":
          return due >= startTomorrow.getTime() && due < startDayAfter.getTime();
        case "week":
          return due >= startToday.getTime() && due < startNextWeek.getTime();
        default:
          return true;
      }
    }

    const visible = tasks.filter(
      (t) => (kindFilter === "all" || t.kind === kindFilter) && inDateFilter(t),
    );

    const noDate: Task[] = [];
    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const later: Task[] = [];
    for (const t of visible) {
      if (!t.dueAt) {
        noDate.push(t);
        continue;
      }
      const due = new Date(t.dueAt).getTime();
      if (due < startToday.getTime()) overdue.push(t);
      else if (due < startTomorrow.getTime()) today.push(t);
      else if (due < startDayAfter.getTime()) tomorrow.push(t);
      else later.push(t);
    }
    const byDue = (a: Task, b: Task) =>
      new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime();
    overdue.sort(byDue);
    today.sort(byDue);
    tomorrow.sort(byDue);
    later.sort(byDue);
    return { noDate, overdue, today, tomorrow, later };
  }, [tasks, kindFilter, dateFilter]);

  const total =
    noDate.length + overdue.length + today.length + tomorrow.length + later.length;

  return (
    <div className="grid gap-4">
      {/* Filters: actie + datum */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-lg border border-[color:var(--border-soft)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[color:var(--orange)]"
        >
          <option value="all">Alle acties</option>
          {kindOptions.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label} ({k.count})
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="rounded-lg border border-[color:var(--border-soft)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[color:var(--orange)]"
        >
          {DATE_FILTERS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {(kindFilter !== "all" || dateFilter !== "all") && (
          <button
            onClick={() => {
              setKindFilter("all");
              setDateFilter("all");
            }}
            className="text-xs font-semibold text-[color:var(--text-muted)] underline"
          >
            Filters wissen
          </button>
        )}
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-10 text-center text-sm text-[color:var(--text-muted)]">
          {tasks.length === 0
            ? "Geen open taken. Lekker bezig."
            : "Geen taken binnen deze filters."}
        </div>
      ) : (
        <>
          <Bucket
            label="Zonder datum — zet een vervaldatum"
            icon={CalendarOff}
            tone="red"
            tasks={noDate}
            showDateSetter
          />
          <Bucket label="Verlopen" icon={AlertTriangle} tone="red" tasks={overdue} />
          <Bucket label="Vandaag" icon={Sun} tone="orange" tasks={today} />
          <Bucket label="Morgen" icon={Sunrise} tone="navy" tasks={tomorrow} />
          <Bucket label="Later" icon={Clock} tone="navy" tasks={later} />
        </>
      )}
    </div>
  );
}

function Bucket({
  label,
  icon: Icon,
  tone,
  tasks,
  showDateSetter = false,
}: {
  label: string;
  icon: typeof Sun;
  tone: "red" | "orange" | "navy";
  tasks: Task[];
  showDateSetter?: boolean;
}) {
  if (tasks.length === 0) return null;
  const toneColor =
    tone === "red"
      ? "var(--red)"
      : tone === "orange"
        ? "var(--orange)"
        : "var(--navy)";
  return (
    <section className="rounded-xl border border-[color:var(--border-soft)] bg-white">
      <div className="flex items-center gap-2 border-b border-[color:var(--border-soft)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.05em]">
        <Icon className="size-4" strokeWidth={2.4} style={{ color: toneColor }} />
        <span style={{ color: toneColor }}>{label}</span>
        <span className="text-[color:var(--text-muted)]">· {tasks.length}</span>
      </div>
      <ul className="divide-y divide-[color:var(--border-soft)]">
        {tasks.map((t) => (
          <TaskItem key={t.taskId} task={t} showDateSetter={showDateSetter} />
        ))}
      </ul>
    </section>
  );
}

function TaskItem({
  task,
  showDateSetter,
}: {
  task: Task;
  showDateSetter: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [dueDraft, setDueDraft] = useState("");
  const [savingDue, setSavingDue] = useState(false);
  const Icon = KIND_ICON[task.kind] ?? MessageSquare;

  async function complete() {
    setDone(true);
    try {
      const res = await fetch(`/api/admin/crm/tasks/${task.taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) {
        setDone(false);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setDone(false);
    }
  }

  async function saveDueDate() {
    if (!dueDraft || savingDue) return;
    setSavingDue(true);
    try {
      const res = await fetch(`/api/admin/crm/tasks/${task.taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dueAt: new Date(dueDraft).toISOString() }),
      });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setSavingDue(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        onClick={complete}
        className={
          "grid size-5 shrink-0 place-items-center rounded border " +
          (done
            ? "border-green-600 bg-green-600 text-white"
            : "border-[color:var(--border-soft)] bg-white hover:border-[color:var(--orange)]")
        }
        title="Markeer als af"
      >
        {done && <Check className="size-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className={
            "text-sm font-semibold " +
            (done ? "text-[color:var(--text-muted)] line-through" : "")
          }
        >
          <Icon className="mr-1.5 inline size-3.5 text-[color:var(--text-muted)]" />
          {task.title}
          <span className="ml-2 rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-[0.625rem] font-semibold text-[color:var(--text-muted)]">
            {kindLabel(task.kind)}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-[color:var(--text-muted)]">
          {task.orgName}
          {task.dueAt && (
            <>
              {" · "}
              {new Date(task.dueAt).toLocaleString("nl-NL", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
          {task.notes && <> · {task.notes}</>}
        </div>
      </div>
      {showDateSetter && (
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="date"
            value={dueDraft}
            onChange={(e) => setDueDraft(e.target.value)}
            className="rounded-lg border border-[color:var(--border-soft)] bg-white px-2 py-1.5 text-xs"
          />
          <button
            onClick={saveDueDate}
            disabled={!dueDraft || savingDue}
            className="rounded-lg bg-[color:var(--orange)] px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            title="Vervaldatum zetten"
          >
            Zet datum
          </button>
        </div>
      )}
      <Link
        href={`/admin/crm?tab=organizations&open=${task.orgId}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--navy)] hover:bg-[color:var(--surface-2)]"
      >
        Open taak
        <ArrowRight className="size-3.5" />
      </Link>
    </li>
  );
}
