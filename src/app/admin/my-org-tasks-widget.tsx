// Dicteren.ai — Persoonlijke org-tasks-widget op /admin overzicht.
//
// Toont voor ingelogde AM (account_owner = self) de open taken uit
// crm_org_tasks gegroepeerd in: verlopen / vandaag / morgen. Per task
// een complete-checkbox en deeplink naar de org-detail-page.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ListChecks,
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
  orgId: string;
  orgName: string;
};

const KIND_ICON: Record<string, typeof Mail> = {
  call: Phone,
  email: Mail,
  meeting: Video,
  visit: MapPin,
  follow_up: CalendarDays,
  other: MessageSquare,
};

function iconFor(kind: string) {
  return KIND_ICON[kind] ?? MessageSquare;
}

export function MyOrgTasksWidget({
  overdue,
  today,
  tomorrow,
}: {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
}) {
  const total = overdue.length + today.length + tomorrow.length;

  return (
    <div className="brand-card overflow-hidden p-0">
      <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
        <ListChecks
          className="size-4 mr-2"
          strokeWidth={2.2}
          style={{ color: "var(--orange)" }}
        />
        <h3 className="text-sm font-bold">Mijn taken</h3>
        <span className="ml-2 rounded-full bg-[color:var(--bg-deep)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
          {total} open
        </span>
        <Link
          href="/admin/crm"
          className="ml-auto text-xs font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]"
        >
          Hele CRM
        </Link>
      </div>

      {total === 0 ? (
        <div className="p-6 text-center text-sm text-[color:var(--text-muted)]">
          Geen open taken voor vandaag of morgen. Lekker bezig.
        </div>
      ) : (
        <div className="grid divide-y divide-[color:var(--border-soft)]">
          <Bucket
            label="Verlopen"
            icon={AlertTriangle}
            tone="red"
            tasks={overdue}
          />
          <Bucket label="Vandaag" icon={Sun} tone="orange" tasks={today} />
          <Bucket
            label="Morgen"
            icon={Sunrise}
            tone="navy"
            tasks={tomorrow}
          />
        </div>
      )}
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
    <section>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 text-[0.6875rem] font-bold uppercase tracking-[0.05em]">
        <Icon className="size-3.5" strokeWidth={2.4} style={{ color: toneColor }} />
        <span style={{ color: toneColor }}>{label}</span>
        <span className="ml-1 text-[color:var(--text-muted)]">
          · {tasks.length}
        </span>
      </div>
      <ul className="divide-y divide-[color:var(--border-soft)]">
        {tasks.map((t) => (
          <TaskItem key={t.taskId} task={t} tone={tone} />
        ))}
      </ul>
    </section>
  );
}

function TaskItem({ task, tone }: { task: Task; tone: "red" | "orange" | "navy" }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const Icon = iconFor(task.kind);

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

  const accent =
    tone === "red"
      ? "bg-red-50/40"
      : tone === "orange"
        ? "bg-orange-50/30"
        : "bg-[color:var(--surface-2)]";

  return (
    <li className={"flex items-start gap-3 px-4 py-2.5 " + accent}>
      <button
        onClick={complete}
        className={
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded border " +
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
        <div className="mt-0.5 text-[0.6875rem] text-[color:var(--text-muted)]">
          <Link
            href={`/admin/crm?tab=organizations&open=${task.orgId}`}
            className="font-semibold hover:text-[color:var(--navy)] hover:underline"
          >
            {task.orgName}
          </Link>
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
        </div>
      </div>
    </li>
  );
}
