// Dicteren.ai — Admin: nieuwe partner-organisatie aanmaken (inline-row in CRM).
// Account-owner default = naam van de admin/account-manager die de rij maakt.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { createPartnerOrg, bulkCreatePartnerOrgs } from "@/lib/services/partner";

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

  const name = String(body.organizationName ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { success: false, error: "Naam is verplicht" },
      { status: 400 },
    );
  }

  // Bulk-mode: { rows: [...] }
  if (Array.isArray(body.rows)) {
    const rows = (body.rows as Array<Record<string, unknown>>).filter(
      (r) => typeof r.organizationName === "string" && r.organizationName.trim(),
    );
    const result = await bulkCreatePartnerOrgs({
      rows: rows.map((r) => ({
        organizationName: String(r.organizationName),
        segment: (r.segment as string | undefined) ?? null,
        priority: (r.priority as string | undefined) ?? "B",
        email: (r.email as string | undefined) ?? null,
        phone: (r.phone as string | undefined) ?? null,
        city: (r.city as string | undefined) ?? null,
        website: (r.website as string | undefined) ?? null,
        decisionMaker: (r.decisionMaker as string | undefined) ?? null,
        accountOwner: (r.accountOwner as string | undefined) ?? null,
        outreachStatus: (r.outreachStatus as string | undefined) ?? "Nieuw",
        pilotStatus: (r.pilotStatus as string | undefined) ?? "Nog niet gestart",
        whyRelevant: (r.whyRelevant as string | undefined) ?? null,
        organizationType: (r.organizationType as string | undefined) ?? null,
        notes: (r.notes as string | undefined) ?? null,
      })),
      actorId: session.user.id,
      actorName: session.user.name ?? null,
    });
    return NextResponse.json({ success: true, ...result });
  }

  // Single create
  const row = await createPartnerOrg({
    organizationName: name,
    segment: (body.segment as string | undefined) ?? null,
    priority: (body.priority as string | undefined) ?? "B",
    email: (body.email as string | undefined) ?? null,
    phone: (body.phone as string | undefined) ?? null,
    city: (body.city as string | undefined) ?? null,
    website: (body.website as string | undefined) ?? null,
    decisionMaker: (body.decisionMaker as string | undefined) ?? null,
    accountOwner: (body.accountOwner as string | undefined) ?? null,
    outreachStatus: (body.outreachStatus as string | undefined) ?? "Nieuw",
    pilotStatus: (body.pilotStatus as string | undefined) ?? "Nog niet gestart",
    whyRelevant: (body.whyRelevant as string | undefined) ?? null,
    organizationType: (body.organizationType as string | undefined) ?? null,
    notes: (body.notes as string | undefined) ?? null,
    actorId: session.user.id,
    actorName: session.user.name ?? null,
  });

  return NextResponse.json({ success: true, partner: row });
}
