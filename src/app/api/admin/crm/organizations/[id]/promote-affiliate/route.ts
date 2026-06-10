// Dicteren.ai — Admin: reseller-org promoveren naar een affiliate-account.
// Guards (status=reseller, niet dubbel, contact met e-mail) zitten in de service.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { promoteToAffiliate } from "@/lib/services/resellerFlow";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const result = await promoteToAffiliate({
    orgId: id,
    actorUserId: session.user.id,
  });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 422 },
    );
  }
  return NextResponse.json({ success: true, data: result });
}
