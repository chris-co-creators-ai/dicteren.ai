"use client";

// Pi-console client: runs links, stappen-stream rechts. Poll't elke 5s.
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentRunListItem,
  AgentStepItem,
} from "@/lib/services/mcpAgent";

const STATUS_STYLE: Record<string, string> = {
  running: "bg-aqua/15 text-aqua border-aqua/30",
  done: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  error: "bg-red-500/15 text-red-600 border-red-500/30",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s geleden`;
  if (s < 3600) return `${Math.floor(s / 60)}m geleden`;
  return `${Math.floor(s / 3600)}u geleden`;
}

export function PiConsole({ initialRuns }: { initialRuns: AgentRunListItem[] }) {
  const [runs, setRuns] = useState<AgentRunListItem[]>(initialRuns);
  const [selected, setSelected] = useState<string | null>(
    initialRuns[0]?.id ?? null,
  );
  const [steps, setSteps] = useState<AgentStepItem[]>([]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const refreshRuns = useCallback(async () => {
    const r = await fetch("/api/admin/agent-runs", { cache: "no-store" });
    if (!r.ok) return;
    const json = await r.json();
    setRuns(json.data.runs as AgentRunListItem[]);
  }, []);

  const refreshSteps = useCallback(async (runId: string) => {
    const r = await fetch(`/api/admin/agent-runs?runId=${runId}`, {
      cache: "no-store",
    });
    if (!r.ok) return;
    const json = await r.json();
    if (selectedRef.current === runId) {
      setSteps(json.data.steps as AgentStepItem[]);
    }
  }, []);

  useEffect(() => {
    if (selected) refreshSteps(selected);
  }, [selected, refreshSteps]);

  useEffect(() => {
    const t = setInterval(() => {
      refreshRuns();
      if (selectedRef.current) refreshSteps(selectedRef.current);
    }, 5000);
    return () => clearInterval(t);
  }, [refreshRuns, refreshSteps]);

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        Pi heeft nog niets gedaan. Zodra hij een opdracht oppakt verschijnt die
        hier live.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* Runs */}
      <div className="space-y-2">
        {runs.map((run) => (
          <button
            key={run.id}
            onClick={() => setSelected(run.id)}
            className={`w-full rounded-lg border p-3 text-left transition ${
              selected === run.id
                ? "border-aqua bg-aqua/5"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {run.title ?? "Naamloze opdracht"}
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
                  STATUS_STYLE[run.status] ?? ""
                }`}
              >
                {run.status}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {run.stepCount} {run.stepCount === 1 ? "stap" : "stappen"}
                {run.progress ? ` · ${run.progress}` : ""}
              </span>
              <span>{timeAgo(run.lastStepAt)}</span>
            </div>
            {run.requestedByName && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Gevraagd door {run.requestedByName}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Stappen-stream */}
      <div className="rounded-lg border p-4">
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen stappen in deze run.
          </p>
        ) : (
          <ol className="space-y-3">
            {steps.map((step) => (
              <li key={step.seq} className="flex gap-3">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    step.status === "error" ? "bg-red-500" : "bg-aqua"
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {step.tool}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(step.createdAt)}
                    </span>
                  </div>
                  {step.summary && (
                    <p className="mt-0.5 text-sm">{step.summary}</p>
                  )}
                  {step.refs?.organizationId ? (
                    <a
                      href={`/admin/crm?org=${String(step.refs.organizationId)}`}
                      className="text-xs text-aqua hover:underline"
                    >
                      Open organisatie →
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
