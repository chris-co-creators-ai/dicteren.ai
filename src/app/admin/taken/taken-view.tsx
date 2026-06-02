"use client";

// Dicteren.ai — /admin/taken client-view. Groepeert open taken op vervaldatum
// met een complete-checkbox + "open taak" → de juiste organisatie.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
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

export function TakenView({
  overdue,
  today,
  tomorrow,
  later,
}: {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  later: Task[];
}) {
  const total =
    overdue.length + today.length + tomorrow.length + later.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--border-soft)] bg-white p-10 text-center text-sm text-[color:var(--text-muted)]">
        Geen open taken. Lekker bezig.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Bucket label="Verlopen" icon={AlertTriangle} tone="red" tasks={overdue} />
      <Bucket label="Vandaag" icon={Sun} tone="orange" tasks={today} />
      <Bucket label="Morgen" icon={Sunrise} tone="navy" tasks={tomorrow} />
      <Bucket label="Later / zonder datum" icon={Clock} tone="navy" tasks={later} />
    </div>
  );
}

function Bucket({
  label,
  icon: Icon,
  tone,
  tasks,
}: {
  label: string;
  icon: typeof Sun;
  tone: "red" | "orange" | "navy";
  tasks: Task[];
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
          <TaskItem key={t.taskId} task={t} />
        ))}
      </ul>
    </section>
  );
}

function TaskItem({ task }: { task: Task }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState(false);
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
