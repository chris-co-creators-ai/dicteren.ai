import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listSpaces } from "@/lib/services/content";

export async function GET() {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const spaces = await listSpaces();
  return NextResponse.json({ success: true, spaces });
}
