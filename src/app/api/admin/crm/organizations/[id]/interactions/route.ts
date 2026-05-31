// Dicteren.ai — Admin: interactie loggen op een organisatie.
//
// Een gelogde interactie (call/email/linkedin/meeting/note) wordt een crm_event
// met kind "interaction_logged" en de gestructureerde gegevens in de payload —
// zichtbaar in de bestaande Timeline. De verplichte vervolgstap wordt een
// crm_org_task (het bestaande taken-systeem). Geen aparte activity-tabel.
//
// Type, richting en resultaat komen uit de SSOT (config/crmActivity.ts) en
// worden server-side gevalideerd. Notitie is het enige vrije veld.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { logCrmEvent, addCrmOrgTask } from "@/lib/services/crmDeals";
import {
  isValidDirection,
  isValidOutcome,
  activityTypeLabel,
  ACTIVITY_TYPES,
  type ActivityType,
  type ActivityDirection,
} from "@/lib/config/crmActivity";

type Params = Promise<{ id: string }>;

const TYPE_KEYS = ACTIVITY_TYPES.map((t) => t.key);

// Staptype → crm_org_tasks.kind (bestaande taak-vocabulary).
const STEP_TASK_KIND: Record<ActivityType, string> = {
  call: "phone",
  email: "email",
  linkedin: "follow_up",
  meeting: "demo",
  note: "other",
};

function isActivityType(v: unknown): v is ActivityType {
  return typeof v === "string" && TYPE_KEYS.includes(v as ActivityType);
}

function parseDate(v: unknown): Date | null {
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: orgId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  if (!isActivityType(body.type)) {
    return NextResponse.json(
      { success: false, error: "Ongeldig interactie-type" },
      { status: 400 },
    );
  }
  const type = body.type;

  const direction = body.direction;
  if (
    typeof direction !== "string" ||
    !isValidDirection(type, direction as ActivityDirection)
  ) {
    return NextResponse.json(
      { success: false, error: "Richting past niet bij dit type" },
      { status: 400 },
    );
  }

  let outcome: string | null = null;
  if (body.outcome != null && body.outcome !== "") {
    if (typeof body.outcome !== "string" || !isValidOutcome(type, body.outcome)) {
      return NextResponse.json(
        { success: false, error: "Resultaat past niet bij dit type" },
        { status: 400 },
      );
    }
    outcome = body.outcome;
  }

  const note =
    typeof body.note === "string" && body.note.trim() !== ""
      ? body.note.trim()
      : null;

  const occurredAt =
    body.occurredAt !== undefined ? parseDate(body.occurredAt) : new Date();
  if (body.occurredAt !== undefined && !occurredAt) {
    return NextResponse.json(
      { success: false, error: "Ongeldig tijdstip" },
      { status: 400 },
    );
  }

  // Optionele vervolgstap valideren vóór we iets wegschrijven.
  let nextTask:
    | { type: ActivityType; dueAt: Date; note: string | null }
    | null = null;
  if (body.nextTask != null) {
    const nt = body.nextTask as Record<string, unknown>;
    if (!isActivityType(nt.type)) {
      return NextResponse.json(
        { success: false, error: "Ongeldig type vervolgstap" },
        { status: 400 },
      );
    }
    const due = parseDate(nt.dueAt);
    if (!due) {
      return NextResponse.json(
        { success: false, error: "Vervolgstap heeft een geldige datum nodig" },
        { status: 400 },
      );
    }
    nextTask = {
      type: nt.type,
      dueAt: due,
      note:
        typeof nt.note === "string" && nt.note.trim() !== ""
          ? nt.note.trim()
          : null,
    };
  }

  // 1. De interactie als timeline-event.
  await logCrmEvent({
    crmOrganizationId: orgId,
    actorUserId: session.user.id,
    kind: "interaction_logged",
    payload: {
      type,
      direction,
      outcome,
      note,
      occurredAt: (occurredAt ?? new Date()).toISOString(),
    },
  });

  // 2. De verplichte vervolgstap als taak.
  let taskCreated = false;
  if (nextTask) {
    await addCrmOrgTask({
      actorUserId: session.user.id,
      data: {
        crmOrganizationId: orgId,
        title: nextTask.note || activityTypeLabel(nextTask.type),
        kind: STEP_TASK_KIND[nextTask.type] ?? "other",
        dueAt: nextTask.dueAt,
        createdByUserId: session.user.id,
        notes: nextTask.note,
      },
    });
    taskCreated = true;
  }

  return NextResponse.json({ success: true, taskCreated });
}
