// Dicteren.ai — Bulk: zet het funnel-spoor (eindklant/reseller) op prospects.
//   { contactIds: string[], prospectType: "eindklant" | "reseller" }
// Classificeert verse gescrapede leads in de twee funnels (migratie 0052).
// Alle staff mogen (her)classificeren — gedeelde pijplijn.

import { NextResponse } from "next/server";
import { requireScopedAm } from "@/lib/auth/session";
import { setContactsProspectType } from "@/lib/services/crmAssign";

export async function POST(request: Request) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;

  let body: { contactIds?: string[]; prospectType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body ongeldig" }, { status: 400 });
  }
  const contactIds = Array.isArray(body.contactIds) ? body.contactIds : [];
  if (contactIds.length === 0) {
    return NextResponse.json({ success: false, error: "Geen contactIds" }, { status: 400 });
  }
  if (body.prospectType !== "eindklant" && body.prospectType !== "reseller") {
    return NextResponse.json(
      { success: false, error: "prospectType moet 'eindklant' of 'reseller' zijn" },
      { status: 400 },
    );
  }

  const result = await setContactsProspectType({
    contactIds,
    prospectType: body.prospectType,
    actorUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, ...result });
}
