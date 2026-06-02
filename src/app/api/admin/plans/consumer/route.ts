// Dicteren.ai — Actieve consument-plannen (staff-only, voor de "betaal-link
// op maat"-dropdown in het CRM side-panel).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listConsumerPlans } from "@/lib/services/order";

export async function GET() {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const plans = await listConsumerPlans();
  return NextResponse.json({ success: true, plans });
}
