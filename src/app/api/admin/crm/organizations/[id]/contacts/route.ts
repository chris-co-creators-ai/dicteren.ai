// Dicteren.ai — Admin: contacten van een CRM-organisatie (lijst + aanmaken)

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  addCrmContact,
  listContactsForOrg,
} from "@/lib/services/crmDeals";

type Params = Promise<{ id: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const contacts = await listContactsForOrg(id);
  return NextResponse.json({ success: true, data: contacts });
}

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id: orgId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name || !email) {
    return NextResponse.json(
      { success: false, error: "Naam en e-mail zijn verplicht" },
      { status: 400 },
    );
  }

  const created = await addCrmContact({
    actorUserId: session.user.id,
    data: {
      crmOrganizationId: orgId,
      name,
      email,
      phone: (body.phone as string | null) ?? null,
      roleAtCompany: (body.roleAtCompany as string | null) ?? null,
      isPrimary: Boolean(body.isPrimary),
      notes: (body.notes as string | null) ?? null,
    },
  });

  return NextResponse.json({ success: true, data: created });
}
