// Dicteren.ai — Admin: keur de aangeleverde brand identity goed (partner-funnel,
// stage "Brand identity controleren"). De gate vóór publiceren. Zet een AM-taak
// "publiceer landingpagina".

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { approveBrandIdentity } from "@/lib/services/partnerFunnel";

type Params = Promise<{ contactId: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { contactId } = await params;

  await approveBrandIdentity(contactId, session.user.id);
  return NextResponse.json({ success: true });
}
