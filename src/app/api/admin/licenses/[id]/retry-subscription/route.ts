// Dicteren.ai — Admin: mislukte auto-renew alsnog aanmaken (G4).
//
// POST /api/admin/licenses/{id}/retry-subscription
//
// Voor het geval de webhook subscription.creation_failed logde: geld binnen,
// licentie er, maar geen auto-renew. Recomputed het bedrag exact als de webhook
// en maakt de Mollie-subscription alsnog aan. Admin + account manager.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { retrySubscriptionForLicense } from "@/lib/services/adminSupport";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const { id } = await params;

  const result = await retrySubscriptionForLicense({
    licenseId: id,
    actorUserId: session.user.id,
  });

  if (!result.success) {
    return NextResponse.json(result, {
      status: result.code === "NOT_FOUND" ? 404 : 400,
    });
  }
  return NextResponse.json(result);
}
