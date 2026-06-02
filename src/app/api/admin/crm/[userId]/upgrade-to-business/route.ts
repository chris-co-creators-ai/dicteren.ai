// Dicteren.ai — Admin/AM: consument-account upgraden naar een zakelijke deal.
//
// Een AM krijgt (via mail/telefoon) het verzoek van een privé-gebruiker om
// zakelijk verder te gaan. Deze route maakt in één stap:
//   1. een nieuwe crm_organization (bron = consumer_upgrade, status = lead),
//      met de AM/admin als eigenaar + voorgestelde seats/plan;
//   2. de consument als PRIMAIR contact, gekoppeld via auth_user_id.
//
// Bewust GEEN dedup-blokkade zoals de publieke contacts-route: het e-mailadres
// bestaat hier per definitie al (de auth-user). We koppelen 'm juist expliciet.
// De UI springt na succes naar het org-panel (Betaling-tab) voor de betaal-link.

import { NextResponse } from "next/server";
import { requireScopedAm } from "@/lib/auth/session";
import { createCrmOrganization, addCrmContact } from "@/lib/services/crmDeals";
import { getCustomerSummary } from "@/lib/services/customer-timeline";

type Params = Promise<{ userId: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { session, isAdmin, ownerUserId } = guard;
  const { userId } = await params;

  // Authoritatieve klantgegevens uit de DB (niet uit de client vertrouwen).
  const summary = await getCustomerSummary(userId);
  if (!summary) {
    return NextResponse.json(
      { success: false, error: "Klant niet gevonden" },
      { status: 404 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }

  const companyName = String(body.companyName ?? "").trim();
  if (!companyName) {
    return NextResponse.json(
      { success: false, error: "Bedrijfsnaam is verplicht" },
      { status: 400 },
    );
  }

  const seats =
    body.seats != null && String(body.seats).trim() !== ""
      ? Number(body.seats)
      : null;
  const planSlug =
    ((body.planSlug as string | null) ?? null)?.trim() || null;
  const kvk = ((body.kvk as string | null) ?? null)?.trim() || null;

  // AM mag de eigenaar niet overschrijven (force = self); admin krijgt zichzelf.
  const ownerId = isAdmin ? session.user.id : ownerUserId!;

  const org = await createCrmOrganization({
    actorUserId: session.user.id,
    data: {
      name: companyName,
      kvk,
      countryCode: "NL",
      source: "consumer_upgrade",
      status: "lead",
      accountOwnerId: ownerId,
      proposedSeats: Number.isFinite(seats as number) ? seats : null,
      proposedPlanSlug: planSlug,
      notes: `Upgrade vanuit consument-account (${summary.email}).`,
    },
  });

  await addCrmContact({
    actorUserId: session.user.id,
    data: {
      crmOrganizationId: org.id,
      name: summary.name,
      email: summary.email,
      isPrimary: true,
      authUserId: userId,
    },
  });

  return NextResponse.json({ success: true, organizationId: org.id });
}
