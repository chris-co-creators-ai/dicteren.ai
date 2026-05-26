"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Loader2,
  Mail,
  Phone,
  Video,
  MapPin,
  CalendarDays,
  MessageSquare,
  ArrowRight,
} from "lucide-react";

type OpenTask = {
  id: string;
  partnerOrgId: string;
  organizationName: string;
  externalId: string;
  accountOwner: string | null;
  title: string;
  kind: string;
  dueDate: string | null;
  notes: string | null;
};

const KIND_ICON: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  demo: Video,
  visit: MapPin,
  follow_up: CalendarDays,
  other: MessageSquare,
};

const KIND_LABEL: Record<string, string> = {
  email: "Mailen",
  phone: "Bellen",
  demo: "Demo",
  visit: "Kantoorbezoek",
  follow_up: "Follow-up",
  other: "Taak",
};

function fmtDue(iso: string | null): {
  text: string;
  isOverdue: boolean;
  isToday: boolean;
} {
  if (!iso) return { text: "Geen datum", isOverdue: false, isToday: false };
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (dayStart.getTime() - today.getTime()) / (24 * 3600 * 1000),
  );
  const isToday = diffDays === 0;
  const isOverdue = diffDays < 0;
  let text: string;
  if (isToday) text = "Vandaag";
  else if (diffDays === 1) text = "Morgen";
  else if (diffDays === -1) text = "Gisteren";
  else if (diffDays > 1 && diffDays < 7) text = `Over ${diffDays} dagen`;
  else if (diffDays < -1 && diffDays > -14)
    text = `${Math.abs(diffDays)} dagen geleden`;
  else
    text = date.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "short",
    });
  return { text, isOverdue, isToday };
}

export function OpenTasksWidget({ initialTasks }: { initialTasks: OpenTask[] }) {
  const [tasks, setTasks] = useState<OpenTask[]>(initialTasks);
  const [completing, setCompleting] = useState<string | null>(null);

  async function markDone(id: string) {
    setCompleting(id);
    try {
      const res = await fetch(`/api/admin/partners/tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (res.ok) setTasks((cur) => cur.filter((t) => t.id !== id));
    } finally {
      setCompleting(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="brand-card p-5">
        <div className="flex items-center">
          <h3 className="text-sm font-bold">Openstaande taken · partners</h3>
          <Link
            href="/admin/partners"
            className="ml-auto text-xs font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]"
          >
            Naar partners
          </Link>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-[color:var(--border-soft)] p-6 text-center text-sm text-[color:var(--text-muted)]">
          Geen openstaande taken. Voeg er één toe via een partner in{" "}
          <Link
            href="/admin/partners"
            className="font-semibold text-[color:var(--navy)] underline"
          >
            /admin/partners
          </Link>
          .
        </div>
      </div>
    );
  }

  const overdueCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date(),
  ).length;

  return (
    <div className="brand-card overflow-hidden p-0">
      <div className="flex items-center border-b border-[color:var(--border-soft)] p-4">
        <h3 className="text-sm font-bold">Openstaande taken · partners</h3>
        {overdueCount > 0 && (
          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[0.625rem] font-bold text-red-800">
            {overdueCount} verlopen
          </span>
        )}
        <Link
          href="/admin/partners"
          className="ml-auto text-xs font-semibold text-[color:var(--navy-500)] hover:text-[color:var(--navy)]"
        >
          Naar partners
        </Link>
      </div>
      <ul className="divide-y divide-[color:var(--border-soft)]">
        {tasks.map((t) => {
          const Icon = KIND_ICON[t.kind] ?? MessageSquare;
          const due = fmtDue(t.dueDate);
          const isCompleting = completing === t.id;
          return (
            <li
              key={t.id}
              className={`flex items-center gap-3 p-3 ${
                due.isOverdue ? "bg-red-50/40" : ""
              }`}
            >
              <button
                onClick={() => markDone(t.id)}
                disabled={isCompleting}
                title="Markeer klaar"
                className="grid size-6 shrink-0 place-items-center rounded border border-[color:var(--border-soft)] hover:border-[color:var(--green)] hover:bg-green-50 disabled:opacity-50"
              >
                {isCompleting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3 text-[color:var(--text-muted)]" />
                )}
              </button>

              <Icon
                className="size-4 shrink-0 text-[color:var(--text-muted)]"
                strokeWidth={2.2}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold">
                    {t.title}
                  </span>
                  <span className="shrink-0 text-[0.625rem] text-[color:var(--text-muted)]">
                    {KIND_LABEL[t.kind] ?? t.kind}
                  </span>
                </div>
                <Link
                  href={`/admin/partners?open=${t.partnerOrgId}`}
                  className="text-[0.6875rem] text-[color:var(--text-muted)] hover:underline"
                >
                  {t.organizationName}
                  {t.accountOwner ? ` · ${t.accountOwner}` : ""}
                </Link>
              </div>

              <div className="shrink-0 text-right text-xs">
                <div
                  className={`font-semibold ${
                    due.isOverdue
                      ? "text-red-700"
                      : due.isToday
                        ? "text-[color:var(--orange-600)]"
                        : "text-[color:var(--text-muted)]"
                  }`}
                >
                  {due.text}
                </div>
              </div>

              <Link
                href={`/admin/partners?open=${t.partnerOrgId}`}
                className="grid size-7 place-items-center rounded-full hover:bg-[color:var(--surface-2)]"
              >
                <ArrowRight className="size-3 text-[color:var(--text-muted)]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
