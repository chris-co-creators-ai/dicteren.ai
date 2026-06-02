// Dicteren.ai — Bulk-toewijzing/overdracht van prospects aan een AM.
//   { contactIds: string[], assignToUserId: string | null }
// Admin: elke prospect. Account manager: alleen z'n eigen leads (server-side
// gescoped op org.account_owner_id = self) overdragen aan een collega-AM.

import { NextResponse } from "next/server";
import { requireScopedAm } from "@/lib/auth/session";
import { assignContacts } from "@/lib/services/crmAssign";

export async function POST(request: Request) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;

  let body: { contactIds?: string[]; assignToUserId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body ongeldig" }, { status: 400 });
  }
  const contactIds = Array.isArray(body.contactIds) ? body.contactIds : [];
  if (contactIds.length === 0) {
    return NextResponse.json({ success: false, error: "Geen contactIds" }, { status: 400 });
  }

  const result = await assignContacts({
    contactIds,
    assignToUserId: body.assignToUserId ?? null,
    actorUserId: guard.session.user.id,
    ownerScopeUserId: guard.isAdmin ? null : guard.ownerUserId,
  });
  return NextResponse.json({ success: true, ...result });
}
