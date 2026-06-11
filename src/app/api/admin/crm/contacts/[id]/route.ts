// Dicteren.ai — Admin: CRM contact PATCH + DELETE

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  deleteCrmContact,
  getCrmContact,
  updateCrmContact,
} from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

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

  const patch: Record<string, unknown> = {};
  const allowed = [
    "name",
    "firstName",
    "lastName",
    "email",
    "phone",
    "mobilePhone",
    "roleAtCompany",
    "isPrimary",
    "notes",
    // Koppel een bestaand contact (bv. prospect zonder org) aan een org —
    // de dedup-flow in de Contacten-tab gebruikt dit ipv een duplicaat maken.
    "crmOrganizationId",
  ];
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  // Naam-sync: bewerkt iemand voor- of achternaam zonder expliciete naam,
  // dan blijft `name` (de display/fallback overal) consistent.
  if (
    !("name" in patch) &&
    ("firstName" in patch || "lastName" in patch)
  ) {
    const current = await getCrmContact(id);
    if (current) {
      const first =
        "firstName" in patch
          ? String(patch.firstName ?? "")
          : current.firstName ?? "";
      const last =
        "lastName" in patch
          ? String(patch.lastName ?? "")
          : current.lastName ?? "";
      const full = `${first} ${last}`.trim();
      if (full) patch.name = full;
    }
  }

  const updated = await updateCrmContact({
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
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id } = await params;
  const ok = await deleteCrmContact(id, session.user.id);
  return NextResponse.json({ success: ok });
}
