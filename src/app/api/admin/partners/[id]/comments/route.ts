// Dicteren.ai — Partner-comments: GET + POST per partner-org.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  addPartnerComment,
  listPartnerComments,
} from "@/lib/services/partnerComments";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await ctx.params;
  const comments = await listPartnerComments(id);
  return NextResponse.json({ success: true, comments });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const text = String(body.body ?? "").trim();
  if (!text)
    return NextResponse.json(
      { success: false, error: "Comment mag niet leeg zijn" },
      { status: 400 },
    );

  const comment = await addPartnerComment({
    partnerOrgId: id,
    body: text,
    authorUserId: session.user.id,
  });

  return NextResponse.json({
    success: true,
    comment: {
      ...comment,
      authorName: session.user.name,
    },
  });
}
