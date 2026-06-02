import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  setCustomerAttributes,
  type CustomerStageValue,
  type CustomerTemperatureValue,
} from "@/lib/services/customerCrm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id: userId } = await params;

  let body: {
    stage?: CustomerStageValue | null;
    temperature?: CustomerTemperatureValue | null;
    assignedToUserId?: string | null;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const updated = await setCustomerAttributes(userId, {
    stage: body.stage,
    temperature: body.temperature,
    assignedToUserId: body.assignedToUserId,
    notes: body.notes,
    lastActivityAt: new Date(),
  });

  return NextResponse.json({ success: true, attributes: updated });
}
