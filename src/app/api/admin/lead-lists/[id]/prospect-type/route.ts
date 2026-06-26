// Dicteren.ai — Zet een hele lead-lijst op een funnel-spoor (eindklant/reseller).
//   { prospectType: "eindklant" | "reseller" }
// Alle prospect-members krijgen het type; de lijst onthoudt het als default voor
// nieuwe imports. De bulk-classificatie voor verse gescrapede lijsten (migratie 0052).

import { NextResponse } from "next/server";
import { requireScopedAm } from "@/lib/auth/session";
import { setLeadListProspectType } from "@/lib/services/crmAssign";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;
  const { id } = await params;

  let body: { prospectType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body ongeldig" }, { status: 400 });
  }
  if (body.prospectType !== "eindklant" && body.prospectType !== "reseller") {
    return NextResponse.json(
      { success: false, error: "prospectType moet 'eindklant' of 'reseller' zijn" },
      { status: 400 },
    );
  }

  const result = await setLeadListProspectType({
    listId: id,
    prospectType: body.prospectType,
    actorUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, ...result });
}
