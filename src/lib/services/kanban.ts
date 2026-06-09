// Dicteren.ai — Interne Kanban-borden (team-taken) service.
//
// Mechanics-laag voor borden/kolommen/taken/subtaken/comments. Domeinregels
// (wie mag wat) staan in de route-guards (requireStaffApi). Alle mutaties
// loggen naar de audit-trail. Zie .claude/prds/kanban-boards.
import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import {
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  kanbanTaskComments,
} from "@/lib/db/schema/kanban";
import { logEvent } from "@/lib/services/audit";

const STAFF_ROLES = ["admin", "account_manager"];

const DEFAULT_COLUMNS = [
  { name: "Backlog", isDoneColumn: false },
  { name: "Te doen", isDoneColumn: false },
  { name: "In progress", isDoneColumn: false },
  { name: "Done", isDoneColumn: true },
];

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

/** Teamleden (admins + account managers) — bron voor assignees + @mentions. */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const rows = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
    })
    .from(authUsers)
    .where(inArray(authUsers.role, STAFF_ROLES))
    .orderBy(asc(authUsers.name));
  return rows;
}

// ───── Boards ──────────────────────────────────────────────────────

export type BoardListItem = {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  ownerName: string | null;
  visibility: "shared" | "private";
  color: string | null;
  openTaskCount: number;
  createdAt: Date;
};

/** Borden die de viewer mag zien: alle gedeelde borden + zijn eigen privé. */
export async function listBoards(viewerId: string): Promise<BoardListItem[]> {
  const rows = await db
    .select({
      id: kanbanBoards.id,
      name: kanbanBoards.name,
      description: kanbanBoards.description,
      ownerUserId: kanbanBoards.ownerUserId,
      ownerName: authUsers.name,
      visibility: kanbanBoards.visibility,
      color: kanbanBoards.color,
      createdAt: kanbanBoards.createdAt,
    })
    .from(kanbanBoards)
    .leftJoin(authUsers, eq(authUsers.id, kanbanBoards.ownerUserId))
    .where(
      and(
        isNull(kanbanBoards.archivedAt),
        or(
          eq(kanbanBoards.visibility, "shared"),
          eq(kanbanBoards.ownerUserId, viewerId),
        ),
      ),
    )
    .orderBy(desc(kanbanBoards.createdAt));

  if (rows.length === 0) return [];

  // Open-task-count per board (niet-afgerond, niet-gearchiveerd, top-level).
  const counts = await db
    .select({
      boardId: kanbanTasks.boardId,
      n: sql<number>`count(*)::int`,
    })
    .from(kanbanTasks)
    .where(
      and(
        inArray(
          kanbanTasks.boardId,
          rows.map((r) => r.id),
        ),
        isNull(kanbanTasks.completedAt),
        isNull(kanbanTasks.archivedAt),
        isNull(kanbanTasks.parentTaskId),
      ),
    )
    .groupBy(kanbanTasks.boardId);
  const countMap = new Map(counts.map((c) => [c.boardId, c.n]));

  return rows.map((r) => ({
    ...r,
    visibility: r.visibility as "shared" | "private",
    openTaskCount: countMap.get(r.id) ?? 0,
  }));
}

export async function getBoard(id: string) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.id, id))
    .limit(1);
  return board ?? null;
}

export async function listBoardColumns(boardId: string) {
  return db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, boardId))
    .orderBy(asc(kanbanColumns.position));
}

export async function createBoard(args: {
  name: string;
  description?: string | null;
  visibility?: "shared" | "private";
  color?: string | null;
  ownerUserId: string;
}) {
  const [board] = await db
    .insert(kanbanBoards)
    .values({
      name: args.name,
      description: args.description ?? null,
      visibility: args.visibility ?? "shared",
      color: args.color ?? null,
      ownerUserId: args.ownerUserId,
    })
    .returning();

  // Seed de default-kolommen.
  await db.insert(kanbanColumns).values(
    DEFAULT_COLUMNS.map((c, i) => ({
      boardId: board.id,
      name: c.name,
      position: i,
      isDoneColumn: c.isDoneColumn,
    })),
  );

  await logEvent({
    action: "admin.action",
    entityType: "kanban_board",
    entityId: board.id,
    actorId: args.ownerUserId,
    metadata: { kind: "board_created", name: board.name },
  });
  return board;
}

export async function updateBoard(
  id: string,
  patch: { name?: string; description?: string | null; visibility?: "shared" | "private"; color?: string | null },
  actorId: string,
) {
  const [board] = await db
    .update(kanbanBoards)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(kanbanBoards.id, id))
    .returning();
  if (board) {
    await logEvent({
      action: "admin.action",
      entityType: "kanban_board",
      entityId: id,
      actorId,
      metadata: { kind: "board_updated" },
    });
  }
  return board ?? null;
}

export async function archiveBoard(id: string, actorId: string) {
  await db
    .update(kanbanBoards)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(kanbanBoards.id, id));
  await logEvent({
    action: "admin.action",
    entityType: "kanban_board",
    entityId: id,
    actorId,
    metadata: { kind: "board_archived" },
  });
  return true;
}

// ───── Tasks ───────────────────────────────────────────────────────

export type BoardTask = {
  id: string;
  boardId: string;
  columnId: string | null;
  title: string;
  description: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: Date | null;
  position: number;
  completedAt: Date | null;
  subtaskCount: number;
  doneSubtaskCount: number;
  commentCount: number;
};

/** Top-level taken van een bord (geen subtaken), met assignee + tellers. */
export async function listBoardTasks(boardId: string): Promise<BoardTask[]> {
  const rows = await db
    .select({
      id: kanbanTasks.id,
      boardId: kanbanTasks.boardId,
      columnId: kanbanTasks.columnId,
      title: kanbanTasks.title,
      description: kanbanTasks.description,
      assigneeUserId: kanbanTasks.assigneeUserId,
      assigneeName: authUsers.name,
      priority: kanbanTasks.priority,
      dueAt: kanbanTasks.dueAt,
      position: kanbanTasks.position,
      completedAt: kanbanTasks.completedAt,
    })
    .from(kanbanTasks)
    .leftJoin(authUsers, eq(authUsers.id, kanbanTasks.assigneeUserId))
    .where(
      and(
        eq(kanbanTasks.boardId, boardId),
        isNull(kanbanTasks.parentTaskId),
        isNull(kanbanTasks.archivedAt),
      ),
    )
    .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.createdAt));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  // Subtask-tellers (alle subtaken van deze parents).
  const subs = await db
    .select({
      parentTaskId: kanbanTasks.parentTaskId,
      completedAt: kanbanTasks.completedAt,
    })
    .from(kanbanTasks)
    .where(
      and(inArray(kanbanTasks.parentTaskId, ids), isNull(kanbanTasks.archivedAt)),
    );
  const subTotal = new Map<string, number>();
  const subDone = new Map<string, number>();
  for (const s of subs) {
    if (!s.parentTaskId) continue;
    subTotal.set(s.parentTaskId, (subTotal.get(s.parentTaskId) ?? 0) + 1);
    if (s.completedAt)
      subDone.set(s.parentTaskId, (subDone.get(s.parentTaskId) ?? 0) + 1);
  }

  // Comment-tellers.
  const comments = await db
    .select({
      taskId: kanbanTaskComments.taskId,
      n: sql<number>`count(*)::int`,
    })
    .from(kanbanTaskComments)
    .where(inArray(kanbanTaskComments.taskId, ids))
    .groupBy(kanbanTaskComments.taskId);
  const commentMap = new Map(comments.map((c) => [c.taskId, c.n]));

  return rows.map((r) => ({
    ...r,
    priority: r.priority as BoardTask["priority"],
    subtaskCount: subTotal.get(r.id) ?? 0,
    doneSubtaskCount: subDone.get(r.id) ?? 0,
    commentCount: commentMap.get(r.id) ?? 0,
  }));
}

export async function createTask(args: {
  boardId: string;
  columnId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  assigneeUserId?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  dueAt?: Date | null;
  createdByUserId: string;
}) {
  // Plaats onderaan de kolom.
  const [maxPos] = await db
    .select({ p: sql<number>`coalesce(max(${kanbanTasks.position}), -1)::int` })
    .from(kanbanTasks)
    .where(
      args.columnId
        ? eq(kanbanTasks.columnId, args.columnId)
        : eq(kanbanTasks.boardId, args.boardId),
    );
  const [task] = await db
    .insert(kanbanTasks)
    .values({
      boardId: args.boardId,
      columnId: args.columnId ?? null,
      parentTaskId: args.parentTaskId ?? null,
      title: args.title,
      description: args.description ?? null,
      assigneeUserId: args.assigneeUserId ?? null,
      priority: args.priority ?? "normal",
      dueAt: args.dueAt ?? null,
      position: (maxPos?.p ?? -1) + 1,
      createdByUserId: args.createdByUserId,
    })
    .returning();
  await logEvent({
    action: "admin.action",
    entityType: "kanban_task",
    entityId: task.id,
    actorId: args.createdByUserId,
    metadata: { kind: "task_created", boardId: args.boardId, title: task.title },
  });
  return task;
}

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    assigneeUserId?: string | null;
    priority?: "low" | "normal" | "high" | "urgent";
    dueAt?: Date | null;
  },
  actorId: string,
) {
  const [task] = await db
    .update(kanbanTasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, id))
    .returning();
  if (task) {
    await logEvent({
      action: "admin.action",
      entityType: "kanban_task",
      entityId: id,
      actorId,
      metadata: { kind: "task_updated" },
    });
  }
  return task ?? null;
}

/** Verplaats een taak naar een kolom (+ positie). Done-kolom zet completedAt. */
export async function moveTask(
  id: string,
  columnId: string,
  position: number,
  actorId: string,
) {
  const [col] = await db
    .select({ isDone: kanbanColumns.isDoneColumn })
    .from(kanbanColumns)
    .where(eq(kanbanColumns.id, columnId))
    .limit(1);
  const completedAt = col?.isDone ? new Date() : null;
  const [task] = await db
    .update(kanbanTasks)
    .set({ columnId, position, completedAt, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, id))
    .returning();
  if (task) {
    await logEvent({
      action: "admin.action",
      entityType: "kanban_task",
      entityId: id,
      actorId,
      metadata: { kind: "task_moved", columnId, done: !!completedAt },
    });
  }
  return task ?? null;
}

export async function archiveTask(id: string, actorId: string) {
  // Archiveer de taak + z'n subtaken (geen DB-FK op parent_task_id).
  await db
    .update(kanbanTasks)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(or(eq(kanbanTasks.id, id), eq(kanbanTasks.parentTaskId, id)));
  await logEvent({
    action: "admin.action",
    entityType: "kanban_task",
    entityId: id,
    actorId,
    metadata: { kind: "task_archived" },
  });
  return true;
}

// ───── Subtasks ────────────────────────────────────────────────────

export async function listSubtasks(parentTaskId: string) {
  return db
    .select({
      id: kanbanTasks.id,
      title: kanbanTasks.title,
      completedAt: kanbanTasks.completedAt,
      assigneeUserId: kanbanTasks.assigneeUserId,
      assigneeName: authUsers.name,
    })
    .from(kanbanTasks)
    .leftJoin(authUsers, eq(authUsers.id, kanbanTasks.assigneeUserId))
    .where(
      and(
        eq(kanbanTasks.parentTaskId, parentTaskId),
        isNull(kanbanTasks.archivedAt),
      ),
    )
    .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.createdAt));
}

/** Vink een (sub)taak af of weer aan. */
export async function toggleTaskDone(id: string, done: boolean, actorId: string) {
  const [task] = await db
    .update(kanbanTasks)
    .set({ completedAt: done ? new Date() : null, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, id))
    .returning();
  if (task) {
    await logEvent({
      action: "admin.action",
      entityType: "kanban_task",
      entityId: id,
      actorId,
      metadata: { kind: done ? "task_completed" : "task_reopened" },
    });
  }
  return task ?? null;
}

// ───── Comments + mentions ─────────────────────────────────────────

export type TaskComment = {
  id: string;
  taskId: string;
  authorUserId: string;
  authorName: string | null;
  body: string;
  mentions: string[] | null;
  createdAt: Date;
};

export async function listTaskComments(taskId: string): Promise<TaskComment[]> {
  const rows = await db
    .select({
      id: kanbanTaskComments.id,
      taskId: kanbanTaskComments.taskId,
      authorUserId: kanbanTaskComments.authorUserId,
      authorName: authUsers.name,
      body: kanbanTaskComments.body,
      mentions: kanbanTaskComments.mentions,
      createdAt: kanbanTaskComments.createdAt,
    })
    .from(kanbanTaskComments)
    .leftJoin(authUsers, eq(authUsers.id, kanbanTaskComments.authorUserId))
    .where(eq(kanbanTaskComments.taskId, taskId))
    .orderBy(asc(kanbanTaskComments.createdAt));
  return rows.map((r) => ({ ...r, mentions: r.mentions ?? null }));
}

export async function addTaskComment(args: {
  taskId: string;
  body: string;
  authorUserId: string;
  mentions?: string[];
}) {
  const [comment] = await db
    .insert(kanbanTaskComments)
    .values({
      taskId: args.taskId,
      body: args.body,
      authorUserId: args.authorUserId,
      mentions: args.mentions && args.mentions.length ? args.mentions : null,
    })
    .returning();
  await logEvent({
    action: "admin.action",
    entityType: "kanban_task",
    entityId: args.taskId,
    actorId: args.authorUserId,
    metadata: { kind: "task_comment_added", mentions: args.mentions ?? [] },
  });
  return comment;
}

// ───── Persoonlijke takenlijst (voor /admin/taken) ─────────────────

export type AssignedKanbanTask = {
  id: string;
  boardId: string;
  boardName: string | null;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: Date | null;
  columnName: string | null;
};

/** Open Kanban-taken die aan een teamlid zijn toegewezen. */
export async function listAssignedTasks(
  userId: string,
): Promise<AssignedKanbanTask[]> {
  const rows = await db
    .select({
      id: kanbanTasks.id,
      boardId: kanbanTasks.boardId,
      boardName: kanbanBoards.name,
      title: kanbanTasks.title,
      priority: kanbanTasks.priority,
      dueAt: kanbanTasks.dueAt,
      columnName: kanbanColumns.name,
    })
    .from(kanbanTasks)
    .leftJoin(kanbanBoards, eq(kanbanBoards.id, kanbanTasks.boardId))
    .leftJoin(kanbanColumns, eq(kanbanColumns.id, kanbanTasks.columnId))
    .where(
      and(
        eq(kanbanTasks.assigneeUserId, userId),
        isNull(kanbanTasks.completedAt),
        isNull(kanbanTasks.archivedAt),
      ),
    )
    .orderBy(asc(kanbanTasks.dueAt));
  return rows.map((r) => ({
    ...r,
    priority: r.priority as AssignedKanbanTask["priority"],
  }));
}
