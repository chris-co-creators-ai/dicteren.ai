// Dicteren.ai — Agent-observability: runs + stappen van Pi (de GTM-agent).
//
// Pi handelt via MCP-tools. Elke tool-call wordt server-side een agent_step,
// gegroepeerd onder een agent_run. Zo kan het team in /admin live meekijken wat
// Pi doet, los van wat hij oplevert. Een run = een afgebakende opdracht; de
// stappen zijn de tool-calls. requestedByUserId = de AM die Pi de opdracht gaf
// (Pi blijft de actor op alle CRM-mutaties; dit is puur de opdrachtgever).
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";

export const agentRunStatus = pgEnum("agent_run_status", [
  "running",
  "done",
  "error",
]);

export const agentStepStatus = pgEnum("agent_step_status", ["ok", "error"]);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentUserId: uuid("agent_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(
      () => authUsers.id,
      { onDelete: "set null" },
    ),
    // Korte intentie die Pi zelf meldt ("Belronde Eindhoven voorbereiden").
    title: text("title"),
    status: agentRunStatus("status").notNull().default("running"),
    // Vrije voortgangsregel ("stap 3/7"), door Pi gezet via report-status.
    progress: text("progress"),
    summary: text("summary"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastStepAt: timestamp("last_step_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("agent_runs_agent_idx").on(t.agentUserId),
    index("agent_runs_status_idx").on(t.status),
    index("agent_runs_last_step_idx").on(t.lastStepAt),
  ],
);

export const agentSteps = pgTable(
  "agent_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    // De MCP-capability (tool-naam), bv. "crm_disposition_set".
    tool: text("tool").notNull(),
    status: agentStepStatus("status").notNull().default("ok"),
    // Compacte input + resultaat-samenvatting (geen volledige payloads).
    input: jsonb("input"),
    result: jsonb("result"),
    // Korte mensleesbare regel voor de console-stream.
    summary: text("summary"),
    // Deep-links naar geraakte records (org-id, taak-id, ...).
    refs: jsonb("refs"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("agent_steps_run_idx").on(t.runId),
    index("agent_steps_created_idx").on(t.createdAt),
  ],
);

export type AgentRun = typeof agentRuns.$inferSelect;
export type AgentStep = typeof agentSteps.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type NewAgentStep = typeof agentSteps.$inferInsert;
