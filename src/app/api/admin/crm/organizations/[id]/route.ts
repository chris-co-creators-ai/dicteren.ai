// Dicteren.ai — Admin: CRM organisatie detail (PATCH + DELETE)

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  deleteCrmOrganization,
  getCrmOrganization,
  updateCrmOrganization,
} from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
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
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
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

  // Whitelist: alleen velden die we via PATCH toestaan
  const patch: Record<string, unknown> = {};
  const allowed = [
    "name",
    "kvk",
    "vatNumber",
    "website",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "city",
    "countryCode",
    "status",
    "source",
    "temperature",
    "accountOwnerId",
    "notes",
    "nextAction",
    "nextActionAt",
    "proposedSeats",
    "proposedAmountCents",
    "proposedPlanSlug",
    "discountCode",
    "lostReason",
  ];
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const updated = await updateCrmOrganization({
    id,
    patch,
    actorUserId: session.user.id,
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
