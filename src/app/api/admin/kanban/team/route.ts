import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listTeamMembers } from "@/lib/services/kanban";

export async function GET() {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const team = await listTeamMembers();
  return NextResponse.json({ success: true, team });
}
