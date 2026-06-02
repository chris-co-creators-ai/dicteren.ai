// Dicteren.ai — Gedeelde FAQ: verwijderen (admin + account manager).

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { deleteFaq } from "@/lib/services/crmFaq";

type Params = Promise<{ id: string }>;

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  await deleteFaq(id);
  return NextResponse.json({ success: true });
}
