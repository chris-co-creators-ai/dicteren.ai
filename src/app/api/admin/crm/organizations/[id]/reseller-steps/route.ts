// Dicteren.ai — Admin: reseller-onboarding-stappen (lijst + toevoegen).
// GET seedt de default-checklist eenmalig zodra de org op reseller staat.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  listResellerSteps,
  addResellerStep,
} from "@/lib/services/resellerFlow";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const steps = await listResellerSteps(id);
  return NextResponse.json({ success: true, data: steps });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }
  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { success: false, error: "Titel is verplicht" },
      { status: 400 },
    );
  }
  const step = await addResellerStep({ orgId: id, title });
  return NextResponse.json({ success: true, data: step });
}
