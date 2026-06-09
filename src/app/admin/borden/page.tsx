import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess, getSession } from "@/lib/auth/session";
import { listBoards } from "@/lib/services/kanban";
import { BoardsClient } from "./boards-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Borden · Admin" };

export default async function BordenPage() {
  await assertStaffPageAccess("/admin/borden");
  const session = (await getSession())!;
  const boards = await listBoards(session.user.id);
  return (
    <>
      <AdminTopbar />
      <main className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Borden</h1>
          <p className="text-sm text-muted-foreground">
            Interne projectborden voor het team. Maak taken voor elkaar, wijs ze
            toe, en zie waar iedereen mee bezig is.
          </p>
        </div>
        <BoardsClient
          boards={boards.map((b) => ({
            ...b,
            createdAt: b.createdAt.toISOString(),
          }))}
          currentUserId={session.user.id}
        />
      </main>
    </>
  );
}
