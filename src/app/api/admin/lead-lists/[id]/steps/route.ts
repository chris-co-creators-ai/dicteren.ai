import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listSteps, createStep } from "@/lib/services/leadListSteps";
import { logEvent } from "@/lib/services/audit";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/config/crmActivity";

const VALID_TYPES = ACTIVITY_TYPES.map((t) => t.key) as ActivityType[];

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && VALID_TYPES.includes(value as ActivityType);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const steps = await listSteps(id);
  return NextResponse.json({ success: true, steps });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const isAdmin = session.user.role === "admin";
  const { id } = await params;

  let body: {
    type?: unknown;
    delayDays?: unknown;
    required?: unknown;
    note?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!isActivityType(body.type)) {
    return NextResponse.json(
      { success: false, error: "Ongeldig staptype" },
      { status: 400 },
    );
  }
  if (
    typeof body.delayDays !== "number" ||
    !Number.isInteger(body.delayDays) ||
    body.delayDays < 0 ||
    body.delayDays > 3650
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "delayDays moet een geheel getal tussen 0 en 3650 zijn",
      },
      { status: 400 },
    );
  }

  try {
    const step = await createStep({
      listId: id,
      type: body.type,
      delayDays: body.delayDays,
      required: typeof body.required === "boolean" ? body.required : undefined,
      note: typeof body.note === "string" ? body.note : null,
      actorUserId: session.user.id,
      isAdmin,
    });

    await logEvent({
      action: "admin.action",
      entityType: "lead_list",
      entityId: id,
      actorId: session.user.id,
      metadata: { kind: "cadence_step_created", stepId: step.id, type: step.type },
    });

    return NextResponse.json({ success: true, step });
  } catch (error) {
    const message = error instanceof Error ? error.message : "error";
    if (message === "forbidden") {
      return NextResponse.json(
        { success: false, error: "Geen rechten op deze lijst" },
        { status: 403 },
      );
    }
    if (message === "not_found") {
      return NextResponse.json(
        { success: false, error: "Lijst niet gevonden" },
        { status: 404 },
      );
    }
    throw error;
  }
}
