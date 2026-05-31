import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { updateStep, deleteStep } from "@/lib/services/leadListSteps";
import { logEvent } from "@/lib/services/audit";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/config/crmActivity";

const VALID_TYPES = ACTIVITY_TYPES.map((t) => t.key) as ActivityType[];

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && VALID_TYPES.includes(value as ActivityType);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const isAdmin = session.user.role === "admin";
  const { id, stepId } = await params;

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

  const patch: {
    type?: ActivityType;
    delayDays?: number;
    required?: boolean;
    note?: string | null;
  } = {};

  if (body.type !== undefined) {
    if (!isActivityType(body.type)) {
      return NextResponse.json(
        { success: false, error: "Ongeldig staptype" },
        { status: 400 },
      );
    }
    patch.type = body.type;
  }
  if (body.delayDays !== undefined) {
    if (typeof body.delayDays !== "number" || !Number.isFinite(body.delayDays)) {
      return NextResponse.json(
        { success: false, error: "delayDays moet een getal zijn" },
        { status: 400 },
      );
    }
    patch.delayDays = body.delayDays;
  }
  if (typeof body.required === "boolean") patch.required = body.required;
  if (body.note !== undefined) {
    patch.note = typeof body.note === "string" ? body.note : null;
  }

  try {
    const step = await updateStep({
      id: stepId,
      patch,
      actorUserId: session.user.id,
      isAdmin,
    });
    if (!step) {
      return NextResponse.json(
        { success: false, error: "Stap niet gevonden" },
        { status: 404 },
      );
    }

    await logEvent({
      action: "admin.action",
      entityType: "lead_list",
      entityId: id,
      actorId: session.user.id,
      metadata: { kind: "cadence_step_updated", stepId, fields: Object.keys(patch) },
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const isAdmin = session.user.role === "admin";
  const { id, stepId } = await params;

  try {
    const removed = await deleteStep({
      id: stepId,
      actorUserId: session.user.id,
      isAdmin,
    });
    if (!removed) {
      return NextResponse.json(
        { success: false, error: "Stap niet gevonden" },
        { status: 404 },
      );
    }

    await logEvent({
      action: "admin.action",
      entityType: "lead_list",
      entityId: id,
      actorId: session.user.id,
      metadata: { kind: "cadence_step_deleted", stepId },
    });

    return NextResponse.json({ success: true });
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
