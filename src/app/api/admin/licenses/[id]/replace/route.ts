// Dicteren.ai — Admin: vervang licentie (revoke + nieuwe + mail).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { replaceLicense } from "@/lib/services/licenseReplace";

type Params = Promise<{ id: string }>;

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const { id } = await params;

  let reason: string | undefined;
  try {
    const body = (await request.json()) as { reason?: string };
    reason = body.reason?.trim() || undefined;
  } catch {
    // empty body is fine
  }

  const result = await replaceLicense({
    licenseId: id,
    actorUserId: session.user.id,
    reason,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    newCode: result.newCode,
    newLicenseId: result.newLicenseId,
    mailSent: result.mailSent,
    mailError: result.mailError,
  });
}
