// Dicteren.ai — Issue partner-licentiecode. Wordt door SidePanel aangeroepen.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { issuePartnerCode } from "@/lib/services/partner";

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

  const seats = Math.max(1, Math.floor(Number(body.seats ?? 50)));
  const monthsRaw = Number(body.months ?? 12);
  const months = Math.max(0, Math.min(120, Math.floor(monthsRaw)));
  const expiresAt =
    months > 0
      ? new Date(Date.now() + months * 30 * 24 * 3600 * 1000)
      : null;

  const result = await issuePartnerCode({
    partnerOrgId: id,
    seats,
    expiresAt,
    actorId: session.user.id,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    code: result.license.code,
    status: result.license.status,
    seats: result.license.seats,
    expiresAt: result.license.expiresAt?.toISOString() ?? null,
    isExisting: result.isExisting,
  });
}
