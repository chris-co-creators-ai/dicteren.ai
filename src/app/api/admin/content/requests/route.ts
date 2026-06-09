import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listRequests, createRequest } from "@/lib/services/content";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const url = new URL(request.url);
  const spaceId = url.searchParams.get("space");
  if (!spaceId) {
    return NextResponse.json(
      { success: false, error: "space is verplicht" },
      { status: 400 },
    );
  }
  const requests = await listRequests(spaceId);
  return NextResponse.json({ success: true, requests });
}

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const body = await request.json().catch(() => ({}));
  const spaceId = (body.spaceId as string | undefined)?.trim();
  const label = (body.label as string | undefined)?.trim();
  if (!spaceId || !label) {
    return NextResponse.json(
      { success: false, error: "spaceId en label zijn verplicht" },
      { status: 400 },
    );
  }
  const dueAt = body.dueAt ? new Date(body.dueAt) : null;
  const req = await createRequest({
    spaceId,
    label,
    description: (body.description as string | undefined) ?? null,
    dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
    createdByUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, request: req });
}
