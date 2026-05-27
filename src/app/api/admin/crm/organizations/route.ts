// Dicteren.ai — Admin: CRM organisaties (lijst + aanmaken)
//
// Scope-regel: account_manager ziet alleen eigen rijen (account_owner_id =
// self.id). Admin ziet alles. Voor account_manager wordt accountOwnerId
// automatisch geforceerd op self.id bij POST, ongeacht body.
//
// Dedup-regel: POST checkt eerst checkDedupBeforeCreate op name+kvk. Bij
// exact_kvk-match → 409 met match-data.

import { NextResponse } from "next/server";
import { requireScopedAm } from "@/lib/auth/session";
import {
  createCrmOrganization,
  listCrmOrganizations,
} from "@/lib/services/crmDeals";
import { checkDedupBeforeCreate } from "@/lib/services/contactDedup";

export async function GET() {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const rows = await listCrmOrganizations({
    accountOwnerId: guard.isAdmin ? null : guard.ownerUserId,
  });
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: Request) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { session, isAdmin, ownerUserId } = guard;

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

  // Dedup-check vóór create
  const dedup = await checkDedupBeforeCreate({
    name,
    kvk: (body.kvk as string | null) ?? null,
  });
  if (!dedup.ok && dedup.reason === "exact_match") {
    return NextResponse.json(
      {
        success: false,
        error: "Deze organisatie bestaat al",
        code: "DUPLICATE",
        matches: dedup.matches,
      },
      { status: 409 },
    );
  }

  // Account-manager mag accountOwnerId NIET overschrijven (force = self)
  const forcedOwnerId = isAdmin
    ? ((body.accountOwnerId as string | undefined) ?? session.user.id)
    : ownerUserId!;

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
      accountOwnerId: forcedOwnerId,
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

  return NextResponse.json({
    success: true,
    data: created,
    fuzzyMatches:
      "reason" in dedup && dedup.reason === "fuzzy_only" ? dedup.matches : [],
  });
}
