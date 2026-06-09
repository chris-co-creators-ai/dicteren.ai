import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { assertStaffPageAccess, getSession } from "@/lib/auth/session";
import {
  getBoard,
  listBoardColumns,
  listBoardTasks,
  listTeamMembers,
} from "@/lib/services/kanban";
import { BoardClient } from "./board-client";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function BoardPage({ params }: { params: Params }) {
  await assertStaffPageAccess("/admin/borden");
  const session = (await getSession())!;
  const { id } = await params;
  const board = await getBoard(id);
  if (!board || board.archivedAt) notFound();

  const [columns, tasks, team] = await Promise.all([
    listBoardColumns(id),
    listBoardTasks(id),
    listTeamMembers(),
  ]);

  return (
    <>
      <AdminTopbar />
      <BoardClient
        board={{ id: board.id, name: board.name, description: board.description }}
        columns={columns.map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
          isDoneColumn: c.isDoneColumn,
        }))}
        tasks={tasks.map((t) => ({
          ...t,
          dueAt: t.dueAt ? t.dueAt.toISOString() : null,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        }))}
        team={team}
        currentUserId={session.user.id}
      />
    </>
  );
}
