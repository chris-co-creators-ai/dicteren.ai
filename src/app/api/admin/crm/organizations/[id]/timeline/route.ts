// Dicteren.ai — Admin: CRM organisatie timeline (events)

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listEventsForOrg } from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 100)));
  const events = await listEventsForOrg(id, limit);
  return NextResponse.json({ success: true, data: events });
}
