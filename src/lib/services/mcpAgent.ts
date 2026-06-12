// Dicteren.ai — Agent-service: de laag waar Pi (de GTM-agent) doorheen handelt.
//
// Drie verantwoordelijkheden:
//  1. Staff-gate op userId (getMcpSession geeft óók consumers een geldige sessie).
//  2. Run/step-observability: elke tool-call wordt deterministisch een stap,
//     gegroepeerd onder de actieve run — geen medewerking van de agent nodig.
//  3. De capability-implementaties: dunne wrappers om bestaande CRM-services,
//     met structured output en actionable errors (AX-principes).
import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { agentRuns, agentSteps } from "@/lib/db/schema/agentRuns";

const STAFF_ROLES = ["admin", "account_manager"];
// Een tool-call hoort bij de meest recente lopende run van deze agent als die
// binnen dit venster z'n laatste stap had; anders begint een nieuwe run.
const RUN_WINDOW_MS = 30 * 60 * 1000;

export type AgentActor = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/** Staff-gate: alleen admin/account_manager mag de agent-laag gebruiken. Gooit
 *  een herkenbare error die de route naar 403 vertaalt. */
export async function getAgentActor(userId: string): Promise<AgentActor> {
  const [u] = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
    })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  if (!u) throw new AgentForbiddenError("Onbekend account");
  if (!u.role || !STAFF_ROLES.includes(u.role)) {
    throw new AgentForbiddenError("Geen toegang: alleen staff-accounts");
  }
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

export class AgentForbiddenError extends Error {}

// ───── Runs + stappen ──────────────────────────────────────────────

/** Vind de actieve run van deze agent of begin er een. requestedBy mag mee uit
 *  de eerste tool-call (Pi geeft door wie 'm aanstuurde). */
async function resolveActiveRun(
  agentUserId: string,
  requestedByUserId?: string | null,
): Promise<string> {
  const since = new Date(Date.now() - RUN_WINDOW_MS);
  const [open] = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.agentUserId, agentUserId),
        eq(agentRuns.status, "running"),
        gte(agentRuns.lastStepAt, since),
      ),
    )
    .orderBy(desc(agentRuns.lastStepAt))
    .limit(1);
  if (open) return open.id;

  const [created] = await db
    .insert(agentRuns)
    .values({ agentUserId, requestedByUserId: requestedByUserId ?? null })
    .returning({ id: agentRuns.id });
  return created.id;
}

/** Log één tool-call als stap onder de actieve run. Retourneert run+seq zodat
 *  de tool-result een verwijzing kan meegeven. */
export async function logStep(args: {
  agentUserId: string;
  requestedByUserId?: string | null;
  tool: string;
  status: "ok" | "error";
  input?: unknown;
  result?: unknown;
  summary?: string;
  refs?: Record<string, unknown>;
}): Promise<{ runId: string; seq: number }> {
  const runId = await resolveActiveRun(args.agentUserId, args.requestedByUserId);
  const [{ n }] = await db
    .select({ n: agentSteps.seq })
    .from(agentSteps)
    .where(eq(agentSteps.runId, runId))
    .orderBy(desc(agentSteps.seq))
    .limit(1)
    .then((rows) => (rows.length ? rows : [{ n: 0 }]));
  const seq = (n ?? 0) + 1;
  await db.insert(agentSteps).values({
    runId,
    seq,
    tool: args.tool,
    status: args.status,
    input: args.input ?? null,
    result: args.result ?? null,
    summary: args.summary ?? null,
    refs: args.refs ?? null,
  });
  await db
    .update(agentRuns)
    .set({ lastStepAt: new Date() })
    .where(eq(agentRuns.id, runId));
  return { runId, seq };
}

/** Pi meldt z'n opdracht + voortgang (verrijkt de console; de run bestaat al). */
export async function reportRunStatus(args: {
  agentUserId: string;
  requestedByUserId?: string | null;
  title?: string;
  progress?: string;
  done?: boolean;
  summary?: string;
}): Promise<{ runId: string }> {
  const runId = await resolveActiveRun(args.agentUserId, args.requestedByUserId);
  await db
    .update(agentRuns)
    .set({
      ...(args.title ? { title: args.title } : {}),
      ...(args.progress ? { progress: args.progress } : {}),
      ...(args.summary ? { summary: args.summary } : {}),
      ...(args.done
        ? { status: "done" as const, finishedAt: new Date() }
        : {}),
      lastStepAt: new Date(),
    })
    .where(eq(agentRuns.id, runId));
  return { runId };
}

// ───── Console-queries (voor /admin) ───────────────────────────────

export type AgentRunListItem = {
  id: string;
  title: string | null;
  status: "running" | "done" | "error";
  progress: string | null;
  requestedByName: string | null;
  stepCount: number;
  startedAt: string;
  lastStepAt: string;
};

export async function listAgentRuns(limit = 30): Promise<AgentRunListItem[]> {
  const rows = await db
    .select({
      id: agentRuns.id,
      title: agentRuns.title,
      status: agentRuns.status,
      progress: agentRuns.progress,
      requestedByName: authUsers.name,
      startedAt: agentRuns.startedAt,
      lastStepAt: agentRuns.lastStepAt,
    })
    .from(agentRuns)
    .leftJoin(authUsers, eq(authUsers.id, agentRuns.requestedByUserId))
    .orderBy(desc(agentRuns.lastStepAt))
    .limit(limit);
  if (!rows.length) return [];

  const counts = await db
    .select({ runId: agentSteps.runId, seq: agentSteps.seq })
    .from(agentSteps)
    .where(inArray(agentSteps.runId, rows.map((r) => r.id)));
  const maxSeq = new Map<string, number>();
  for (const c of counts) {
    maxSeq.set(c.runId, Math.max(maxSeq.get(c.runId) ?? 0, c.seq));
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    progress: r.progress,
    requestedByName: r.requestedByName ?? null,
    stepCount: maxSeq.get(r.id) ?? 0,
    startedAt: r.startedAt.toISOString(),
    lastStepAt: r.lastStepAt.toISOString(),
  }));
}

export type AgentStepItem = {
  seq: number;
  tool: string;
  status: "ok" | "error";
  summary: string | null;
  refs: Record<string, unknown> | null;
  createdAt: string;
};

export async function getAgentRunSteps(runId: string): Promise<AgentStepItem[]> {
  const rows = await db
    .select()
    .from(agentSteps)
    .where(eq(agentSteps.runId, runId))
    .orderBy(agentSteps.seq);
  return rows.map((r) => ({
    seq: r.seq,
    tool: r.tool,
    status: r.status,
    summary: r.summary,
    refs: (r.refs as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
