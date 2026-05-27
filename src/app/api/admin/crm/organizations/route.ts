// Dicteren.ai — Admin: CRM organisaties (lijst + aanmaken)

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  createCrmOrganization,
  listCrmOrganizations,
} from "@/lib/services/crmDeals";

export async function GET() {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const rows = await listCrmOrganizations();
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;

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
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Bedrijfsnaam is verplicht" },
      { status: 400 },
    );
  }

  const created = await createCrmOrganization({
    actorUserId: session.user.id,
    data: {
      name,
      kvk: (body.kvk as string | null) ?? null,
      vatNumber: (body.vatNumber as string | null) ?? null,
      website: (body.website as string | null) ?? null,
      addressLine1: (body.addressLine1 as string | null) ?? null,
      addressLine2: (body.addressLine2 as string | null) ?? null,
      postalCode: (body.postalCode as string | null) ?? null,
      city: (body.city as string | null) ?? null,
      countryCode: (body.countryCode as string) ?? "NL",
      source:
        (body.source as
          | "am_outreach"
          | "self_service"
          | "consumer_upgrade"
          | "csv_import"
          | "lead_form"
          | undefined) ?? "am_outreach",
      status: "lead",
      accountOwnerId:
        (body.accountOwnerId as string | undefined) ?? session.user.id,
      notes: (body.notes as string | null) ?? null,
      proposedSeats: body.proposedSeats
        ? Number(body.proposedSeats)
        : null,
      proposedAmountCents: body.proposedAmountCents
        ? Number(body.proposedAmountCents)
        : null,
      proposedPlanSlug: (body.proposedPlanSlug as string | null) ?? null,
    },
  });

  return NextResponse.json({ success: true, data: created });
}
