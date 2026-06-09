// Dicteren.ai — Interne Kanban-borden (team-taken).
//
// Aparte laag náást de entity-taken (partner_tasks / crm_org_tasks). Borden =
// projecten, kolommen = stages, taken bewegen door de stages, met assignee,
// subtaken (parentTaskId), comments + @mentions. Zie .claude/prds/kanban-boards.
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";

export const kanbanVisibility = pgEnum("kanban_board_visibility", [
  "shared",
  "private",
]);

export const kanbanPriority = pgEnum("kanban_task_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const kanbanBoards = pgTable(
  "kanban_boards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    visibility: kanbanVisibility("visibility").notNull().default("shared"),
    color: text("color"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kanban_boards_owner_idx").on(t.ownerUserId),
    index("kanban_boards_visibility_idx").on(t.visibility),
  ],
);

export const kanbanColumns = pgTable(
  "kanban_columns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    // Taken die in een done-kolom belanden krijgen completedAt gezet.
    isDoneColumn: boolean("is_done_column").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kanban_columns_board_idx").on(t.boardId)],
);

export const kanbanTasks = pgTable(
  "kanban_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => kanbanBoards.id, { onDelete: "cascade" }),
    columnId: uuid("column_id").references(() => kanbanColumns.id, {
      onDelete: "set null",
    }),
    // Subtaak = task met parentTaskId. Plain uuid (geen self-FK om
    // circular-reference in drizzle-kit te vermijden); relatie + cascade-
    // archivering handhaaft de service-laag.
    parentTaskId: uuid("parent_task_id"),
    title: text("title").notNull(),
    description: text("description"),
    assigneeUserId: uuid("assignee_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    priority: kanbanPriority("priority").notNull().default("normal"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kanban_tasks_board_idx").on(t.boardId),
    index("kanban_tasks_column_idx").on(t.columnId),
    index("kanban_tasks_assignee_idx").on(t.assigneeUserId),
    index("kanban_tasks_parent_idx").on(t.parentTaskId),
  ],
);

export const kanbanTaskComments = pgTable(
  "kanban_task_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => kanbanTasks.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    // Array van getagde userIds (@mention), geparsed uit de body.
    mentions: jsonb("mentions").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kanban_task_comments_task_idx").on(t.taskId)],
);

// Bijlagen bij een taak (screenshots/afbeeldingen, document). De file staat in
// R2 (bucket dicteren-content, prefix tasks/); deze tabel is de index/metadata.
export const kanbanTaskAttachments = pgTable(
  "kanban_task_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => kanbanTasks.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kanban_task_attachments_task_idx").on(t.taskId)],
);

export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type KanbanTask = typeof kanbanTasks.$inferSelect;
export type KanbanTaskComment = typeof kanbanTaskComments.$inferSelect;
export type KanbanTaskAttachment = typeof kanbanTaskAttachments.$inferSelect;
