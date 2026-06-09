import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess } from "@/lib/auth/session";
import { listSpaces } from "@/lib/services/content";
import { listTeamMembers } from "@/lib/services/kanban";
import { ContentClient } from "./content-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content · Admin" };

export default async function ContentPage() {
  await assertStaffPageAccess("/admin/content");
  const [spaces, team] = await Promise.all([listSpaces(), listTeamMembers()]);

  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-sm text-muted-foreground">
            Plan social- en marketing-content op de kalender. Elke geplande post
            wordt een taak voor de verantwoordelijke account manager.
          </p>
        </div>
        <ContentClient
          spaces={spaces.map((s) => ({
            id: s.id,
            name: s.name,
            kind: s.kind,
            affiliateName: s.affiliateName,
          }))}
          team={team.map((t) => ({ id: t.id, name: t.name }))}
        />
      </main>
    </>
  );
}
