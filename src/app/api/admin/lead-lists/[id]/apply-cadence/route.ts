import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { applyCadenceToList } from "@/lib/services/leadListSteps";
import { logEvent } from "@/lib/services/audit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const isAdmin = session.user.role === "admin";
  const { id } = await params;

  try {
    const result = await applyCadenceToList({
      listId: id,
      actorUserId: session.user.id,
      isAdmin,
    });

    await logEvent({
      action: "admin.action",
      entityType: "lead_list",
      entityId: id,
      actorId: session.user.id,
      metadata: {
        kind: "cadence_applied",
        membersAffected: result.membersAffected,
        tasksCreated: result.tasksCreated,
        skippedNoOrg: result.skippedNoOrg,
      },
    });

    return NextResponse.json({ success: true, ...result });
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
