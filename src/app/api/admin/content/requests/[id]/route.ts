import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { fulfillRequest } from "@/lib/services/content";

type Params = Promise<{ id: string }>;

// Markeert een checklist-item als geleverd door er een asset aan te koppelen.
export async function PATCH(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const assetId = (body.assetId as string | undefined)?.trim();
  if (!assetId) {
    return NextResponse.json(
      { success: false, error: "assetId is verplicht" },
      { status: 400 },
    );
  }
  const req = await fulfillRequest(id, assetId, guard.session.user.id);
  if (!req) {
    return NextResponse.json({ success: false, error: "Niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ success: true, request: req });
}
