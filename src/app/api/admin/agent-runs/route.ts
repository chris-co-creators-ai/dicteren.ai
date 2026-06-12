// Dicteren.ai — Admin: agent-runs voor de Pi-console. Live-polling (5s) leest
// hier de recente runs + (optioneel) de stappen van één run.
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listAgentRuns, getAgentRunSteps } from "@/lib/services/mcpAgent";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;

  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  if (runId) {
    const steps = await getAgentRunSteps(runId);
    return NextResponse.json({ success: true, data: { steps } });
  }
  const runs = await listAgentRuns(30);
  return NextResponse.json({ success: true, data: { runs } });
}
