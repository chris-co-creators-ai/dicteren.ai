// Dicteren.ai — Bulk-toewijzing van prospects aan een AM (admin-only).
//   { contactIds: string[], assignToUserId: string | null }

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { assignContacts } from "@/lib/services/crmAssign";

export async function POST(request: Request) {
  const guard = await requireStaffApi({ adminOnly: true });
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
  });
  return NextResponse.json({ success: true, ...result });
}
