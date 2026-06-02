// Dicteren.ai — Admin: CRM organisatie detail (GET + PATCH + DELETE)
//
// Scope-regel: account_manager mag alleen eigen rijen lezen/wijzigen
// (account_owner_id = self.id). 403 als niet eigenaar.
// Admin: geen filter, alle rijen.

import { NextResponse } from "next/server";
import { requireScopedAm, requireStaffApi } from "@/lib/auth/session";
import {
  deleteCrmOrganization,
  getCrmOrganization,
  updateCrmOrganization,
} from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

async function assertOwnership(
  orgId: string,
  guard: { isAdmin: boolean; ownerUserId: string | null },
): Promise<Response | null> {
  if (guard.isAdmin) return null;
  const org = await getCrmOrganization(orgId);
  if (!org) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  if (org.accountOwnerId !== guard.ownerUserId) {
    return NextResponse.json(
      { success: false, error: "Geen toegang tot deze organisatie" },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { id } = await params;
  const blocked = await assertOwnership(id, guard);
  if (blocked) return blocked;
  const org = await getCrmOrganization(id);
  if (!org) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: org });
}

export async function PATCH(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { id } = await params;
  const blocked = await assertOwnership(id, guard);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  const allowed = [
    "name",
    "kvk",
    "vatNumber",
    "website",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "houseNumber",
    "city",
    "province",
    "countryCode",
    "status",
    "source",
    "temperature",
    "notes",
    "nextAction",
    "nextActionAt",
    "proposedSeats",
    "proposedAmountCents",
    "proposedPlanSlug",
    "discountCode",
    "lostReason",
  ];
  // Alleen admin mag account_owner_id veranderen (overdracht naar andere AM)
  if (guard.isAdmin) allowed.push("accountOwnerId");

  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const updated = await updateCrmOrganization({
    id,
    patch,
    actorUserId: guard.session.user.id,
  });
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Niet gevonden" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if (guard.response) return guard.response;
  const { id } = await params;
  const ok = await deleteCrmOrganization(id);
  return NextResponse.json({ success: ok });
}
