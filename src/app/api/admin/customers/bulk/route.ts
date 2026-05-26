import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  bulkSetCustomerAttributes,
  type CustomerStageValue,
  type CustomerTemperatureValue,
} from "@/lib/services/customerCrm";

export async function PATCH(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  let body: {
    userIds?: string[];
    stage?: CustomerStageValue | null;
    temperature?: CustomerTemperatureValue | null;
    assignedToUserId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "userIds[] verplicht" },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.stage !== undefined) patch.stage = body.stage;
  if (body.temperature !== undefined) patch.temperature = body.temperature;
  if (body.assignedToUserId !== undefined)
    patch.assignedToUserId = body.assignedToUserId;
  patch.lastActivityAt = new Date();

  const updated = await bulkSetCustomerAttributes({
    userIds: body.userIds,
    patch,
  });

  return NextResponse.json({ success: true, updated });
}
