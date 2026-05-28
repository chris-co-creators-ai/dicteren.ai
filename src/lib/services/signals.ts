// Dicteren.ai — Signal-laag (trigger-events voor AM-werk)
//
// Eén signal = "iets is veranderd waar een AM op moet reageren". Voorbeelden:
// nieuwe vacature, promotie van een contact, funding-round, web-intent.
//
// routeNewSignals is de cron-driver: pakt status='new' signals (hoogste score
// eerst), maakt voor elk een crm_org_task aan op de account-owner van de org,
// flipt status='actioned'. Sluit aan op het autoTaskForOrgPaymentIssue-pattern
// uit crmDeals.ts.

import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmOrganizations, crmSignals } from "@/lib/db/schema";
import { addCrmOrgTask } from "@/lib/services/crmDeals";

export type SignalKind =
  | "new_vacancy"
  | "leadership_change"
  | "funding_round"
  | "web_intent"
  | "tech_stack_change"
  | "promotion"
  | "job_change"
  | "recent_hire"
  | "kvk_change"
  | "press_mention";

const SIGNAL_LABELS: Record<SignalKind, string> = {
  new_vacancy: "Nieuwe vacature",
  leadership_change: "Wissel in management",
  funding_round: "Investering binnen",
  web_intent: "Bezocht onze website",
  tech_stack_change: "Andere software in gebruik",
  promotion: "Promotie",
  job_change: "Nieuwe baan",
  recent_hire: "Nieuw personeel aangenomen",
  kvk_change: "KvK-mutatie",
  press_mention: "Nieuws over bedrijf",
};

function labelFor(kind: string): string {
  return SIGNAL_LABELS[kind as SignalKind] ?? `Signaal: ${kind}`;
}

/** Append a new signal. Returns the inserted id. */
export async function recordSignal(args: {
  contactId?: string | null;
  organizationId?: string | null;
  kind: SignalKind | string;
  payload: Record<string, unknown>;
  /** 0-100. DB CHECK constraint enforces range. */
  score: number;
}): Promise<string> {
  if (!args.contactId && !args.organizationId) {
    throw new Error("recordSignal: contactId of organizationId is verplicht");
  }
  if (args.score < 0 || args.score > 100) {
    throw new Error(`recordSignal: score ${args.score} buiten bereik 0-100`);
  }
  const [row] = await db
    .insert(crmSignals)
    .values({
      contactId: args.contactId ?? null,
      organizationId: args.organizationId ?? null,
      kind: args.kind,
      payload: args.payload,
      score: args.score,
    })
    .returning({ id: crmSignals.id });
  return row.id;
}

/**
 * Cron-driver. Pakt status='new' (hoogste score eerst), maakt voor elke
 * org-gekoppelde signal een crm_org_task aan op de account-owner. Skipt
 * silent als er geen organizationId of geen account-owner is.
 */
export async function routeNewSignals(opts?: {
  limit?: number;
}): Promise<{ routed: number; skipped: number }> {
  const limit = opts?.limit ?? 50;

  const newOnes = await db
    .select({
      id: crmSignals.id,
      organizationId: crmSignals.organizationId,
      kind: crmSignals.kind,
      payload: crmSignals.payload,
      score: crmSignals.score,
    })
    .from(crmSignals)
    .where(eq(crmSignals.status, "new"))
    .orderBy(desc(crmSignals.score))
    .limit(limit);

  let routed = 0;
  let skipped = 0;

  for (const sig of newOnes) {
    if (!sig.organizationId) {
      skipped++;
      continue;
    }
    const [org] = await db
      .select({
        id: crmOrganizations.id,
        accountOwnerId: crmOrganizations.accountOwnerId,
        name: crmOrganizations.name,
      })
      .from(crmOrganizations)
      .where(eq(crmOrganizations.id, sig.organizationId))
      .limit(1);
    if (!org || !org.accountOwnerId) {
      skipped++;
      continue;
    }

    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const task = await addCrmOrgTask({
      data: {
        crmOrganizationId: org.id,
        title: `${labelFor(sig.kind)} bij ${org.name}`,
        kind: "follow_up",
        dueAt,
        createdByUserId: org.accountOwnerId,
        notes:
          typeof sig.payload === "object" && sig.payload
            ? JSON.stringify(sig.payload, null, 2)
            : null,
      },
      actorUserId: org.accountOwnerId,
    });

    await db
      .update(crmSignals)
      .set({ status: "actioned", actionedTaskId: task.id })
      .where(eq(crmSignals.id, sig.id));
    routed++;
  }

  return { routed, skipped };
}

/** Mark a signal as dismissed (no task should be created). */
export async function dismissSignal(signalId: string): Promise<void> {
  await db
    .update(crmSignals)
    .set({ status: "dismissed" })
    .where(eq(crmSignals.id, signalId));
}

/** Expire stale 'new' signals that never got routed (cleanup). */
export async function expireOldSignals(args: {
  olderThanDays: number;
}): Promise<{ expired: number }> {
  const olderThan = new Date(
    Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000,
  );
  const result = await db
    .update(crmSignals)
    .set({ status: "expired" })
    .where(
      and(
        eq(crmSignals.status, "new"),
        sql`detected_at < ${olderThan.toISOString()}`,
      ),
    )
    .returning({ id: crmSignals.id });
  return { expired: result.length };
}
