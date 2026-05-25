import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  setCustomerAttributes,
  type CustomerStageValue,
  type CustomerTemperatureValue,
} from "@/lib/services/customerCrm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admin-rechten vereist" },
      { status: 403 },
    );
  }
  const { userId } = await params;

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
