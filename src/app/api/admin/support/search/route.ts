// Dicteren.ai — Admin: support-zoekopdracht.
//
// GET /api/admin/support/search?q=...
//
// Resolve een vrije term (e-mail/naam/code/order-id/apparaat) naar klant(en)
// voor de support-cockpit. Admin + account manager.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { findCustomersForSupport } from "@/lib/services/adminSupport";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const matches = await findCustomersForSupport(q);
  return NextResponse.json({ success: true, matches });
}
