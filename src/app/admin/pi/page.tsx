// Dicteren.ai — /admin/pi
//
// De agent-console: live meekijken wat Pi (de GTM-agent) doet. Toont recente
// runs (opdrachten) en, per geselecteerde run, de stappen-stream. Data komt uit
// agent_runs/agent_steps via /api/admin/agent-runs; de client poll't elke 5s.
import { assertStaffPageAccess } from "@/lib/auth/session";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { listAgentRuns } from "@/lib/services/mcpAgent";
import { PiConsole } from "./pi-console";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pi · Admin" };

export default async function AdminPiPage() {
  await assertStaffPageAccess("/admin/pi");
  const runs = await listAgentRuns(30);
  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Pi — agent-console</h1>
          <p className="text-sm text-muted-foreground">
            Live overzicht van wat Pi doet. Elke opdracht is een run, elke
            tool-actie een stap. Ververst elke 5 seconden.
          </p>
        </div>
        <PiConsole initialRuns={runs} />
      </main>
    </>
  );
}
