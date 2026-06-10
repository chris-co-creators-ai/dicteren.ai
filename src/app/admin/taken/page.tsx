// Dicteren.ai — /admin/taken
//
// Persoonlijke takenpagina voor account managers: laadt de open CRM-org-taken
// waar de AM account-owner van is, gegroepeerd op vervaldatum. Elke taak heeft
// een "open taak"-knop die de juiste organisatie opent (deeplink naar de
// Organisaties-tab met het side-panel open).

import { assertStaffPageAccess } from "@/lib/auth/session";
import { listOpenOrgTasksForUser } from "@/lib/services/crmDeals";
import { listAssignedTasks } from "@/lib/services/kanban";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { TakenView } from "./taken-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mijn taken · Admin" };

type TaskRow = {
  taskId: string;
  title: string;
  kind: string;
  dueAt: string | null;
  notes: string | null;
  orgId: string;
  orgName: string;
};

export default async function AdminTakenPage() {
  const session = await assertStaffPageAccess("/admin/taken");
  const tasks = await listOpenOrgTasksForUser({
    userId: session.user.id,
    limit: 200,
  });
  const boardTasks = await listAssignedTasks(session.user.id);

  // Groeperen, filteren en sorteren gebeurt client-side in TakenView (filters
  // op actie + datum zonder server-roundtrip; max 200 taken).
  const rows: TaskRow[] = tasks.map((t) => ({
    taskId: t.taskId,
    title: t.title,
    kind: t.kind,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    notes: t.notes,
    orgId: t.orgId,
    orgName: t.orgName,
  }));

  return (
    <>
      <AdminTopbar />
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mijn taken</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Je open taken uit het CRM, op vervaldatum. Open een taak om direct
            naar de organisatie te gaan.
          </p>
        </div>
        {boardTasks.length > 0 && (
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-[color:var(--text-muted)]">
              Toegewezen aan mij op borden ({boardTasks.length})
            </h2>
            <div className="divide-y divide-[color:var(--border-soft)]">
              {boardTasks.map((t) => (
                <a
                  key={t.id}
                  href={`/admin/borden/${t.boardId}`}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[color:var(--navy)]">
                      {t.title}
                    </div>
                    <div className="text-xs text-[color:var(--text-muted)]">
                      {t.boardName ?? "Bord"} · {t.columnName ?? "—"}
                    </div>
                  </div>
                  {t.dueAt && (
                    <span className="shrink-0 text-xs text-[color:var(--text-muted)]">
                      {new Date(t.dueAt).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
        <TakenView tasks={rows} />
      </div>
    </>
  );
}
