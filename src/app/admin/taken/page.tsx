// Dicteren.ai — /admin/taken
//
// Persoonlijke takenpagina voor account managers: laadt de open CRM-org-taken
// waar de AM account-owner van is, gegroepeerd op vervaldatum. Elke taak heeft
// een "open taak"-knop die de juiste organisatie opent (deeplink naar de
// Organisaties-tab met het side-panel open).

import { assertStaffPageAccess } from "@/lib/auth/session";
import { listOpenOrgTasksForUser } from "@/lib/services/crmDeals";
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

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const startDayAfter = new Date(startToday);
  startDayAfter.setDate(startDayAfter.getDate() + 2);

  const overdue: TaskRow[] = [];
  const today: TaskRow[] = [];
  const tomorrow: TaskRow[] = [];
  const later: TaskRow[] = [];

  for (const t of tasks) {
    const row: TaskRow = {
      taskId: t.taskId,
      title: t.title,
      kind: t.kind,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      notes: t.notes,
      orgId: t.orgId,
      orgName: t.orgName,
    };
    if (!t.dueAt) {
      later.push(row);
      continue;
    }
    const due = t.dueAt.getTime();
    if (due < startToday.getTime()) overdue.push(row);
    else if (due < startTomorrow.getTime()) today.push(row);
    else if (due < startDayAfter.getTime()) tomorrow.push(row);
    else later.push(row);
  }

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
        <TakenView
          overdue={overdue}
          today={today}
          tomorrow={tomorrow}
          later={later}
        />
      </div>
    </>
  );
}
