// Dicteren.ai — MCP-server: de agent-interface van het platform.
//
// Pi (Hermes Agent, GTM-engineer) en elke andere MCP-client praten hier met het
// CRM. OAuth 2.1 via de Better Auth mcp-plugin; per request een access-token dat
// getMcpSession naar een userId vertaalt. Staff-gate, rate-limit, en zes tools +
// vier resources + twee prompts die op de bestaande service-laag leunen.
//
// AX-principes (zie .claude/prds/mcp-am-agents/spec.md):
//  - structured output: elke tool declareert outputSchema + structuredContent.
//  - errors zijn instructies: een fout noemt de geldige opties.
//  - resources = ontdekken (workspace + vocabulaires) in weinig calls.
//  - prompts = machine-readable workflows.
//  - permissions = constraints: do_not_call-gate en stage-FSM zitten server-side.
//  - elke tool-call wordt deterministisch een agent_step (observability).
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import {
  getAgentActor,
  AgentForbiddenError,
  logStep,
  reportRunStatus,
} from "@/lib/services/mcpAgent";
import { loadCrmPeoplePage } from "@/lib/services/crmPeople";
import {
  getCrmOrganization,
  getCrmContact,
  listContactsForOrg,
  listTasksForOrg,
  addCrmOrgTask,
  applyDisposition,
  logCrmEvent,
  updateCrmOrganization,
} from "@/lib/services/crmDeals";
import { listOrgActivity } from "@/lib/services/crmActivity";
import {
  DISPOSITIONS,
  DISPOSITION_BY_KEY,
} from "@/lib/services/crmCallDisposition";
import { checkStageGate, STAGE_RANK } from "@/lib/services/stageGates";
import {
  ACTIVITY_TYPES,
  isValidDirection,
  isValidOutcome,
  activityTypeLabel,
  type ActivityType,
  type ActivityDirection,
} from "@/lib/config/crmActivity";
import { createLeadList, getLeadList, listLeadLists } from "@/lib/services/leadList";
import {
  importEnrichedProspects,
  type EnrichedProspectRow,
} from "@/lib/services/prospectImport";
import { setContactsProspectType } from "@/lib/services/crmAssign";
import { ensureDeckToken } from "@/lib/services/partnerFunnel";
import { appBase } from "@/lib/url";
import {
  markContactOutreach,
  OUTREACH_MARKS,
} from "@/lib/services/outreachSuppression";

const TASK_KINDS = ["follow_up", "email", "phone", "demo", "other"] as const;
const ACTIVITY_KEYS = ACTIVITY_TYPES.map((t) => t.key) as [string, ...string[]];
const DISPOSITION_KEYS = DISPOSITIONS.map((d) => d.key) as [string, ...string[]];
const STAGE_KEYS = Object.keys(STAGE_RANK) as [string, ...string[]];
const LIST_TYPES = ["eindklant", "reseller"] as const;
const PROSPECT_TYPES = ["eindklant", "reseller"] as const;
const OUTREACH_MARK_KEYS = OUTREACH_MARKS as unknown as [string, ...string[]];
const TEMPERATURES = ["cold", "lukewarm", "warm", "hot"] as const;

const ProspectRowSchema = z
  .object({
    email: z.string().min(1),
    name: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    seniority: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    twitterUrl: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    emailStatus: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    companyDomain: z.string().nullable().optional(),
    companyLinkedinUrl: z.string().nullable().optional(),
    niche: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    companySizeRange: z.string().nullable().optional(),
    employeeCount: z.number().nullable().optional(),
    revenueRange: z.string().nullable().optional(),
    foundedYear: z.number().nullable().optional(),
    techStack: z.array(z.string()).nullable().optional(),
    keywords: z.array(z.string()).nullable().optional(),
    followersLinkedin: z.number().nullable().optional(),
    followersInstagram: z.number().nullable().optional(),
    followersFacebook: z.number().nullable().optional(),
    followersYoutube: z.number().nullable().optional(),
    followersSubstack: z.number().nullable().optional(),
    followersOwn: z.number().nullable().optional(),
    leadScore: z.number().nullable().optional(),
    temperature: z.enum(TEMPERATURES).nullable().optional(),
    notes: z.string().nullable().optional(),
    extra: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

const KNOWN_PROSPECT_KEYS = new Set(Object.keys(ProspectRowSchema.shape));

type ProspectRowInput = z.infer<typeof ProspectRowSchema>;

function normalizeProspectRows(rows: ProspectRowInput[]): EnrichedProspectRow[] {
  return rows.map((row) => {
    const extra: Record<string, unknown> = { ...(row.extra ?? {}) };
    for (const [key, value] of Object.entries(row)) {
      if (!KNOWN_PROSPECT_KEYS.has(key)) extra[key] = value;
    }
    return {
      email: row.email,
      name: row.name ?? null,
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      phone: row.phone ?? null,
      jobTitle: row.jobTitle ?? null,
      seniority: row.seniority ?? null,
      department: row.department ?? null,
      linkedinUrl: row.linkedinUrl ?? null,
      twitterUrl: row.twitterUrl ?? null,
      city: row.city ?? null,
      country: row.country ?? null,
      emailStatus: row.emailStatus ?? null,
      company: row.company ?? null,
      companyDomain: row.companyDomain ?? null,
      companyLinkedinUrl: row.companyLinkedinUrl ?? null,
      niche: row.niche ?? null,
      industry: row.industry ?? null,
      companySizeRange: row.companySizeRange ?? null,
      employeeCount: row.employeeCount ?? null,
      revenueRange: row.revenueRange ?? null,
      foundedYear: row.foundedYear ?? null,
      techStack: row.techStack ?? null,
      keywords: row.keywords ?? null,
      followersLinkedin: row.followersLinkedin ?? null,
      followersInstagram: row.followersInstagram ?? null,
      followersFacebook: row.followersFacebook ?? null,
      followersYoutube: row.followersYoutube ?? null,
      followersSubstack: row.followersSubstack ?? null,
      followersOwn: row.followersOwn ?? null,
      leadScore: row.leadScore ?? null,
      temperature: row.temperature ?? null,
      notes: row.notes ?? null,
      extra: Object.keys(extra).length ? extra : row.extra ?? null,
    };
  });
}

// Activity-type → crm_org_tasks.kind (zelfde mapping als de interactions-route).
const STEP_TASK_KIND: Record<ActivityType, string> = {
  call: "phone",
  email: "email",
  linkedin: "follow_up",
  meeting: "demo",
  note: "other",
};

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent: Record<string, unknown>;
  isError?: boolean;
};

/** Tekst + structuur in één tool-result (AX: de agent leest velden, parsed niet). */
function ok(structured: Record<string, unknown>, text?: string): ToolResult {
  return {
    content: [{ type: "text", text: text ?? JSON.stringify(structured) }],
    structuredContent: structured,
  };
}

/** Een fout die de agent vertelt wat wél kan (AX: errors zijn instructies). */
function fail(message: string, hint?: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    structuredContent: { error: message, ...(hint ?? {}) },
    isError: true,
  };
}

const handler = async (req: Request) => {
  // 1. Rate-limit per token-fingerprint (Authorization-header), vóór alles.
  const authz = req.headers.get("authorization") ?? "";
  const limited = await enforceRateLimit(req, "mcp", {
    key: authz || "mcp-anon",
  });
  if (limited) return limited;

  // 2. OAuth-sessie. Geen sessie → 401 met WWW-Authenticate die naar de
  //    Protected Resource Metadata wijst (RFC 9728), zodat de client de
  //    auth-server vindt en de OAuth-flow start.
  const session = await auth.api.getMcpSession({ headers: req.headers });
  if (!session) {
    const origin = new URL(req.url).origin;
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    });
  }

  // 3. Staff-gate (consumers hebben óók een geldige sessie).
  let actor;
  try {
    actor = await getAgentActor(session.userId);
  } catch (e) {
    if (e instanceof AgentForbiddenError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    throw e;
  }
  const agentUserId = actor.id;

  // Helper: voer een tool uit en log de stap deterministisch.
  async function withStep(
    tool: string,
    input: unknown,
    run: () => Promise<ToolResult>,
    summarize: (r: ToolResult) => { summary: string; refs?: Record<string, unknown> },
    requestedByUserId?: string | null,
  ): Promise<ToolResult> {
    let result: ToolResult;
    try {
      result = await run();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      await logStep({
        agentUserId,
        requestedByUserId,
        tool,
        status: "error",
        input,
        summary: message,
      });
      return fail(message);
    }
    const s = summarize(result);
    await logStep({
      agentUserId,
      requestedByUserId,
      tool,
      status: result.isError ? "error" : "ok",
      input,
      result: result.structuredContent,
      summary: s.summary,
      refs: s.refs,
    });
    return result;
  }

  return createMcpHandler(
    (server) => {
      // ───── Resources: ontdekken ────────────────────────────────
      server.resource(
        "workspace",
        "dicteren://workspace",
        { description: "Wie de agent is + z'n speelveld (team, capabilities)." },
        async () => ({
          contents: [
            {
              uri: "dicteren://workspace",
              mimeType: "application/json",
              text: JSON.stringify({
                agent: { name: actor.name, role: actor.role },
                capabilities: {
                  tools: [
                    "crm_leads_list",
                    "crm_lead_get",
                    "crm_leadlist_create",
                    "crm_leadlist_list",
                    "crm_leads_import",
                    "crm_deck_token_get",
                    "crm_outreach_mark",
                    "crm_task_create",
                    "crm_interaction_log",
                    "crm_disposition_set",
                    "crm_stage_set",
                    "agent_report_status",
                  ],
                  resources: [
                    "dicteren://vocab/dispositions",
                    "dicteren://vocab/activity",
                    "dicteren://vocab/stages",
                  ],
                  prompts: ["belronde_voorbereiden", "na_gesprek"],
                },
                rules: [
                  "Een organisatie op do_not_call accepteert geen dispositie meer.",
                  "Een contact op email_unsubscribed/do_not_contact mag niet opnieuw naar Instantly of een outbound-sequence.",
                  "Een stage vooruit vereist de verplichte velden van die stage.",
                  "Elke actie wordt op naam van de agent gelogd; geef requestedBy mee wie de opdracht gaf.",
                ],
              }),
            },
          ],
        }),
      );

      server.resource(
        "vocab_dispositions",
        "dicteren://vocab/dispositions",
        { description: "Geldige bel-disposities met labels en gevolgen." },
        async () => ({
          contents: [
            {
              uri: "dicteren://vocab/dispositions",
              mimeType: "application/json",
              text: JSON.stringify(
                DISPOSITIONS.map((d) => ({
                  key: d.key,
                  label: d.label,
                  group: d.group,
                  createsTask: d.task !== "none",
                  flag: d.flag ?? null,
                })),
              ),
            },
          ],
        }),
      );

      server.resource(
        "vocab_activity",
        "dicteren://vocab/activity",
        { description: "Interactie-types met geldige richtingen en resultaten." },
        async () => ({
          contents: [
            {
              uri: "dicteren://vocab/activity",
              mimeType: "application/json",
              text: JSON.stringify(ACTIVITY_TYPES),
            },
          ],
        }),
      );

      server.resource(
        "vocab_stages",
        "dicteren://vocab/stages",
        { description: "Pipeline-stages met de verplichte velden per stage." },
        async () => {
          const { requiredForStatus } = await import("@/lib/services/stageGates");
          return {
            contents: [
              {
                uri: "dicteren://vocab/stages",
                mimeType: "application/json",
                text: JSON.stringify(
                  STAGE_KEYS.map((s) => ({
                    key: s,
                    rank: STAGE_RANK[s],
                    requiredFields: requiredForStatus(s),
                  })),
                ),
              },
            ],
          };
        },
      );

      // ───── Tools: handelen ─────────────────────────────────────
      server.registerTool(
        "crm_leads_list",
        {
          title: "Leads zoeken",
          description:
            "Zoek leads/contacten in het CRM. Filter op zoekterm, stage of bel-dispositie. Gepagineerd.",
          inputSchema: {
            search: z.string().optional().describe("Vrije zoekterm (naam/bedrijf/e-mail/stad)"),
            stage: z.enum(STAGE_KEYS).optional(),
            disposition: z.enum(DISPOSITION_KEYS).optional(),
            limit: z.number().int().min(1).max(50).optional(),
          },
          outputSchema: {
            total: z.number(),
            count: z.number(),
            rows: z.array(z.record(z.string(), z.unknown())),
          },
        },
        async (input) =>
          withStep(
            "crm_leads_list",
            input,
            async () => {
              const page = await loadCrmPeoplePage({
                sessionUserId: agentUserId,
                filters: {
                  ...(input.search ? { search: input.search } : {}),
                  ...(input.stage ? { stage: input.stage } : {}),
                  ...(input.disposition ? { disposition: input.disposition } : {}),
                },
                limit: input.limit ?? 20,
              });
              return ok({
                total: page.total,
                count: page.rows.length,
                rows: page.rows as unknown as Record<string, unknown>[],
              });
            },
            (r) => ({ summary: `${(r.structuredContent.count as number) ?? 0} leads gevonden` }),
          ),
      );

      server.registerTool(
        "crm_lead_get",
        {
          title: "Lead-detail",
          description:
            "Volledig beeld van één organisatie: gegevens, contacten, recente activiteit en open taken.",
          inputSchema: {
            organizationId: z.string().describe("crm_organizations.id"),
          },
          outputSchema: {
            organization: z.record(z.string(), z.unknown()),
            contacts: z.array(z.record(z.string(), z.unknown())),
            activity: z.array(z.record(z.string(), z.unknown())),
            tasks: z.array(z.record(z.string(), z.unknown())),
          },
        },
        async (input) =>
          withStep(
            "crm_lead_get",
            input,
            async () => {
              const org = await getCrmOrganization(input.organizationId);
              if (!org) return fail("Organisatie niet gevonden");
              const [contacts, activity, tasks] = await Promise.all([
                listContactsForOrg(org.id),
                listOrgActivity(org.id),
                listTasksForOrg(org.id),
              ]);
              return ok({
                organization: org as unknown as Record<string, unknown>,
                contacts: contacts as unknown as Record<string, unknown>[],
                activity: activity as unknown as Record<string, unknown>[],
                tasks: tasks as unknown as Record<string, unknown>[],
              });
            },
            (r) => ({
              summary: (r.structuredContent.organization as { name?: string })?.name
                ? `Detail: ${(r.structuredContent.organization as { name: string }).name}`
                : "Lead opgehaald",
              refs: { organizationId: input.organizationId },
            }),
          ),
      );

      server.registerTool(
        "crm_leadlist_create",
        {
          title: "Leadlijst aanmaken",
          description:
            "Maak een CRM-leadlijst aan voor eindklant- of resellerwerving. Gebruik reseller voor Instantly-partnerwerving.",
          inputSchema: {
            name: z.string().min(1),
            listType: z.enum(LIST_TYPES),
            description: z.string().nullable().optional(),
            requestedBy: z.string().optional(),
          },
          outputSchema: {
            listId: z.string(),
            name: z.string(),
            listType: z.string(),
          },
        },
        async (input) =>
          withStep(
            "crm_leadlist_create",
            input,
            async () => {
              const list = await createLeadList({
                name: input.name,
                description: input.description ?? null,
                listType: input.listType,
                ownerUserId: agentUserId,
                isShared: true,
              });
              return ok({ listId: list.id, name: list.name, listType: list.listType });
            },
            (r) => ({
              summary: `Leadlijst aangemaakt: ${(r.structuredContent.name as string) ?? ""}`,
              refs: { listId: r.structuredContent.listId },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_leadlist_list",
        {
          title: "Leadlijsten tonen",
          description: "Toon CRM-leadlijsten met member-counts en funnel-type.",
          inputSchema: {
            requestedBy: z.string().optional(),
          },
          outputSchema: {
            count: z.number(),
            rows: z.array(z.record(z.string(), z.unknown())),
          },
        },
        async (input) =>
          withStep(
            "crm_leadlist_list",
            input,
            async () => {
              const rows = await listLeadLists({ userId: agentUserId });
              return ok({
                count: rows.length,
                rows: rows as unknown as Record<string, unknown>[],
              });
            },
            (r) => ({ summary: `${(r.structuredContent.count as number) ?? 0} leadlijsten gevonden` }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_leads_import",
        {
          title: "Prospects importeren",
          description:
            "Importeer verrijkte prospects in CRM + leadlijst. assignToUserId is verplicht zodat signals later naar een account-owner routen.",
          inputSchema: {
            listId: z.string(),
            prospectType: z.enum(PROSPECT_TYPES),
            assignToUserId: z.string().min(1),
            source: z.string().optional(),
            rows: z.array(ProspectRowSchema).min(1).max(1000),
            requestedBy: z.string().optional(),
          },
          outputSchema: {
            created: z.number(),
            updated: z.number(),
            skipped: z.number(),
            errors: z.array(z.record(z.string(), z.unknown())),
            contactIds: z.array(z.string()),
            prospectType: z.string(),
            listId: z.string(),
          },
        },
        async (input) =>
          withStep(
            "crm_leads_import",
            input,
            async () => {
              const list = await getLeadList(input.listId);
              if (!list) return fail("Leadlijst niet gevonden", { listId: input.listId });
              if (list.listType !== input.prospectType) {
                return fail(
                  `Lijsttype '${list.listType}' past niet bij prospectType '${input.prospectType}'.`,
                  { listType: list.listType, prospectType: input.prospectType },
                );
              }
              const rows = normalizeProspectRows(input.rows as ProspectRowInput[]);
              const result = await importEnrichedProspects(rows, {
                actorUserId: agentUserId,
                assignToUserId: input.assignToUserId,
                listId: input.listId,
                source: input.source ?? "mcp-import",
              });
              if (result.contactIds.length > 0) {
                await setContactsProspectType({
                  contactIds: result.contactIds,
                  prospectType: input.prospectType,
                  actorUserId: agentUserId,
                });
              }
              return ok({
                ...result,
                errors: result.errors as unknown as Record<string, unknown>[],
                prospectType: input.prospectType,
                listId: input.listId,
              });
            },
            (r) => ({
              summary: `Import: ${r.structuredContent.created ?? 0} nieuw, ${r.structuredContent.updated ?? 0} bijgewerkt, ${r.structuredContent.skipped ?? 0} overgeslagen`,
              refs: { listId: input.listId },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_deck_token_get",
        {
          title: "Partnerdeck-link ophalen",
          description:
            "Genereer of hergebruik de persoonlijke /partner/<token>-URL voor een contact.",
          inputSchema: {
            contactId: z.string(),
            requestedBy: z.string().optional(),
          },
          outputSchema: {
            contactId: z.string(),
            deckToken: z.string(),
            deckUrl: z.string(),
          },
        },
        async (input) =>
          withStep(
            "crm_deck_token_get",
            input,
            async () => {
              const contact = await getCrmContact(input.contactId);
              if (!contact) return fail("Contact niet gevonden", { contactId: input.contactId });
              const deckToken = await ensureDeckToken(input.contactId);
              return ok({
                contactId: input.contactId,
                deckToken,
                deckUrl: `${appBase()}/partner/${deckToken}`,
              });
            },
            (r) => ({
              summary: "Partnerdeck-link opgehaald",
              refs: { contactId: input.contactId, deckToken: r.structuredContent.deckToken },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_outreach_mark",
        {
          title: "Outreach-suppressie markeren",
          description:
            "Markeer een contact als unsubscribed, not_interested of do_not_contact. Dit zet CRM-flags en een timeline-event.",
          inputSchema: {
            contactId: z.string(),
            mark: z.enum(OUTREACH_MARK_KEYS),
            reason: z.string().nullable().optional(),
            requestedBy: z.string().optional(),
          },
          outputSchema: {
            contactId: z.string(),
            organizationId: z.string().nullable(),
            mark: z.string(),
            eventId: z.string(),
          },
        },
        async (input) =>
          withStep(
            "crm_outreach_mark",
            input,
            async () => {
              const result = await markContactOutreach({
                contactId: input.contactId,
                mark: input.mark as (typeof OUTREACH_MARKS)[number],
                actorUserId: agentUserId,
                reason: input.reason ?? null,
              });
              if (!result) return fail("Contact niet gevonden", { contactId: input.contactId });
              return ok(result);
            },
            (r) => ({
              summary: `Outreach-markering gezet: ${(r.structuredContent.mark as string) ?? ""}`,
              refs: { contactId: input.contactId, eventId: r.structuredContent.eventId },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_task_create",
        {
          title: "Taak aanmaken",
          description: "Maak een taak op een organisatie aan, met soort en optionele datum.",
          inputSchema: {
            organizationId: z.string(),
            title: z.string().min(1),
            kind: z.enum(TASK_KINDS).optional(),
            dueAt: z.string().datetime().optional().describe("ISO-datum"),
            notes: z.string().optional(),
            requestedBy: z.string().optional().describe("userId van de AM die dit vroeg"),
          },
          outputSchema: { taskId: z.string(), title: z.string() },
        },
        async (input) =>
          withStep(
            "crm_task_create",
            input,
            async () => {
              const org = await getCrmOrganization(input.organizationId);
              if (!org) return fail("Organisatie niet gevonden");
              const dueAt = input.dueAt ? new Date(input.dueAt) : null;
              const task = await addCrmOrgTask({
                actorUserId: agentUserId,
                data: {
                  crmOrganizationId: org.id,
                  title: input.title,
                  kind: input.kind ?? "other",
                  dueAt,
                  createdByUserId: agentUserId,
                  notes: input.notes ?? null,
                },
              });
              return ok({ taskId: task.id, title: task.title });
            },
            (r) => ({
              summary: `Taak aangemaakt: ${(r.structuredContent.title as string) ?? ""}`,
              refs: { organizationId: input.organizationId, taskId: r.structuredContent.taskId },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_interaction_log",
        {
          title: "Interactie loggen",
          description:
            "Log een interactie (call/email/linkedin/meeting/note) met richting en resultaat uit de vaste woordenlijst. Optioneel een vervolgtaak.",
          inputSchema: {
            organizationId: z.string(),
            type: z.enum(ACTIVITY_KEYS),
            direction: z.enum(["outbound", "inbound", "internal"]),
            outcome: z.string().optional(),
            note: z.string().optional(),
            nextTask: z
              .object({
                type: z.enum(ACTIVITY_KEYS),
                dueAt: z.string().datetime(),
                note: z.string().optional(),
              })
              .optional(),
            requestedBy: z.string().optional(),
          },
          outputSchema: { logged: z.boolean(), taskCreated: z.boolean() },
        },
        async (input) =>
          withStep(
            "crm_interaction_log",
            input,
            async () => {
              const org = await getCrmOrganization(input.organizationId);
              if (!org) return fail("Organisatie niet gevonden");
              const type = input.type as ActivityType;
              if (!isValidDirection(type, input.direction as ActivityDirection)) {
                return fail(
                  `Richting '${input.direction}' past niet bij type '${type}'.`,
                  { validDirections: ACTIVITY_TYPES.find((t) => t.key === type)?.directions },
                );
              }
              if (input.outcome && !isValidOutcome(type, input.outcome)) {
                return fail(`Resultaat '${input.outcome}' past niet bij type '${type}'.`, {
                  validOutcomes: ACTIVITY_TYPES.find((t) => t.key === type)?.outcomes,
                });
              }
              await logCrmEvent({
                crmOrganizationId: org.id,
                actorUserId: agentUserId,
                kind: "interaction_logged",
                payload: {
                  type,
                  direction: input.direction,
                  outcome: input.outcome ?? null,
                  note: input.note ?? null,
                  via: "mcp-agent",
                  requestedBy: input.requestedBy ?? null,
                  occurredAt: new Date().toISOString(),
                },
              });
              let taskCreated = false;
              if (input.nextTask) {
                const nt = input.nextTask;
                await addCrmOrgTask({
                  actorUserId: agentUserId,
                  data: {
                    crmOrganizationId: org.id,
                    title: nt.note || activityTypeLabel(nt.type as ActivityType),
                    kind: STEP_TASK_KIND[nt.type as ActivityType] ?? "other",
                    dueAt: new Date(nt.dueAt),
                    createdByUserId: agentUserId,
                    notes: nt.note ?? null,
                  },
                });
                taskCreated = true;
              }
              return ok({ logged: true, taskCreated });
            },
            (r) => ({
              summary: `Interactie '${input.type}' gelogd${
                (r.structuredContent.taskCreated as boolean) ? " + vervolgtaak" : ""
              }`,
              refs: { organizationId: input.organizationId },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_disposition_set",
        {
          title: "Bel-dispositie zetten",
          description:
            "Verwerk de uitkomst van een belpoging. Zet automatisch de juiste vervolgtaak en vlaggen.",
          inputSchema: {
            organizationId: z.string(),
            dispositionKey: z.enum(DISPOSITION_KEYS),
            dueAt: z.string().datetime().optional().describe("Alleen bij disposities die om een datum vragen"),
            requestedBy: z.string().optional(),
          },
          outputSchema: {
            taskId: z.string().nullable(),
            nextActionAt: z.string().nullable(),
          },
        },
        async (input) =>
          withStep(
            "crm_disposition_set",
            input,
            async () => {
              if (!DISPOSITION_BY_KEY[input.dispositionKey]) {
                return fail(`Onbekende dispositie: ${input.dispositionKey}`, {
                  validKeys: DISPOSITION_KEYS,
                });
              }
              try {
                const res = await applyDisposition({
                  orgId: input.organizationId,
                  dispositionKey: input.dispositionKey,
                  dueAt: input.dueAt ? new Date(input.dueAt) : null,
                  actorUserId: agentUserId,
                });
                return ok({
                  taskId: res.taskId,
                  nextActionAt: res.nextActionAt?.toISOString() ?? null,
                });
              } catch (e) {
                // do_not_call-gate + onbekende-org komen hier als nette tool-error.
                return fail(e instanceof Error ? e.message : "Dispositie mislukt");
              }
            },
            () => ({
              summary: `Dispositie '${input.dispositionKey}' gezet`,
              refs: { organizationId: input.organizationId },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "crm_stage_set",
        {
          title: "Pipeline-stage zetten",
          description:
            "Verplaats een organisatie naar een andere pipeline-stage. Vooruit kan alleen als de verplichte velden van die stage gevuld zijn.",
          inputSchema: {
            organizationId: z.string(),
            stage: z.enum(STAGE_KEYS),
            requestedBy: z.string().optional(),
          },
          outputSchema: { stage: z.string(), moved: z.boolean() },
        },
        async (input) =>
          withStep(
            "crm_stage_set",
            input,
            async () => {
              const org = await getCrmOrganization(input.organizationId);
              if (!org) return fail("Organisatie niet gevonden");
              const gate = await checkStageGate(org, input.stage);
              if (!gate.ok) {
                return fail(
                  `Kan niet naar '${input.stage}': verplichte velden ontbreken.`,
                  { missingFields: gate.missing },
                );
              }
              const updated = await updateCrmOrganization({
                id: org.id,
                patch: { status: input.stage as never },
                actorUserId: agentUserId,
              });
              return ok({ stage: input.stage, moved: !!updated });
            },
            () => ({
              summary: `Stage → '${input.stage}'`,
              refs: { organizationId: input.organizationId },
            }),
            input.requestedBy,
          ),
      );

      server.registerTool(
        "agent_report_status",
        {
          title: "Voortgang melden",
          description:
            "Meld je huidige opdracht en voortgang zodat het team live kan meekijken in de console. Roep dit aan bij de start van een opdracht en als je klaar bent.",
          inputSchema: {
            title: z.string().optional().describe("Korte opdracht, bv. 'Belronde Eindhoven voorbereiden'"),
            progress: z.string().optional().describe("Bv. 'stap 3 van 7'"),
            done: z.boolean().optional(),
            summary: z.string().optional(),
            requestedBy: z.string().optional(),
          },
          outputSchema: { runId: z.string() },
        },
        async (input) => {
          const res = await reportRunStatus({
            agentUserId,
            requestedByUserId: input.requestedBy,
            title: input.title,
            progress: input.progress,
            done: input.done,
            summary: input.summary,
          });
          return ok({ runId: res.runId }, "Status bijgewerkt");
        },
      );

      // ───── Prompts: machine-readable workflows ─────────────────
      server.registerPrompt(
        "belronde_voorbereiden",
        {
          title: "Belronde voorbereiden",
          description: "Werkwijze om een belronde voor te bereiden uit een lijst leads.",
          argsSchema: { stad: z.string().optional() },
        },
        (args) => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  "Bereid een belronde voor.",
                  args.stad ? `Focus op stad: ${args.stad}.` : "",
                  "1. Meld je opdracht met agent_report_status.",
                  "2. Haal leads op met crm_leads_list" +
                    (args.stad ? ` (city='${args.stad}')` : "") + ".",
                  "3. Voor de interessante leads: crm_lead_get voor context.",
                  "4. Maak per lead een belscript-notitie of taak met crm_task_create (kind='phone').",
                  "5. Sluit af met agent_report_status (done=true) + een korte samenvatting.",
                  "Respecteer do_not_call: die organisaties sla je over.",
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            },
          ],
        }),
      );

      server.registerPrompt(
        "na_gesprek",
        {
          title: "Na een gesprek verwerken",
          description: "Werkwijze om een telefoongesprek administratief af te ronden.",
          argsSchema: { organizationId: z.string() },
        },
        (args) => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: [
                  `Verwerk het gesprek met organisatie ${args.organizationId}.`,
                  "1. Zet de uitkomst met crm_disposition_set (kies de juiste dispositionKey uit dicteren://vocab/dispositions).",
                  "2. Log details met crm_interaction_log (type='call', met richting en resultaat).",
                  "3. Als er een vervolgafspraak is, voeg een nextTask toe of gebruik crm_task_create.",
                  "Een organisatie op do_not_call accepteert geen dispositie; meld dat dan terug.",
                ].join("\n"),
              },
            },
          ],
        }),
      );
    },
    {
      // Capabilities expliciet aan (tools + resources + prompts).
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
    {
      basePath: "/api/mcp",
      maxDuration: 60,
      verboseLogs: false,
    },
  )(req);
};

export { handler as GET, handler as POST, handler as DELETE };
