import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  updateTask,
  moveTask,
  toggleTaskDone,
  archiveTask,
} from "@/lib/services/kanban";

type Params = Promise<{ id: string }>;

// Eén mutatie-endpoint met een `op`-discriminator: update | move | toggle | archive.
export async function PATCH(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const actor = guard.session.user.id;

  switch (body.op) {
    case "move": {
      if (!body.columnId) {
        return NextResponse.json(
          { success: false, error: "columnId vereist" },
          { status: 400 },
        );
      }
      const task = await moveTask(id, body.columnId, body.position ?? 0, actor);
      return NextResponse.json({ success: true, task });
    }
    case "toggle": {
      const task = await toggleTaskDone(id, body.done === true, actor);
      return NextResponse.json({ success: true, task });
    }
    case "archive": {
      await archiveTask(id, actor);
      return NextResponse.json({ success: true });
    }
    default: {
      const task = await updateTask(
        id,
        {
          title: body.title?.trim(),
          description:
            body.description !== undefined
              ? body.description?.trim() || null
              : undefined,
          assigneeUserId:
            body.assigneeUserId !== undefined ? body.assigneeUserId : undefined,
          priority: body.priority,
          dueAt:
            body.dueAt !== undefined
              ? body.dueAt
                ? new Date(body.dueAt)
                : null
              : undefined,
        },
        actor,
      );
      return NextResponse.json({ success: true, task });
    }
  }
}
