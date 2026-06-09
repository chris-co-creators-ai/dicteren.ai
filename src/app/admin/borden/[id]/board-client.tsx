"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Plus,
  X,
  MessageSquare,
  Archive,
  Send,
  Flag,
  CalendarDays,
} from "lucide-react";

type Column = {
  id: string;
  name: string;
  position: number;
  isDoneColumn: boolean;
};
type Task = {
  id: string;
  boardId: string;
  columnId: string | null;
  title: string;
  description: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: string | null;
  position: number;
  completedAt: string | null;
  subtaskCount: number;
  doneSubtaskCount: number;
  commentCount: number;
};
type TeamMember = { id: string; name: string; email: string; role: string | null };

const PRIORITY: Record<
  Task["priority"],
  { label: string; color: string; bg: string }
> = {
  low: { label: "Laag", color: "var(--text-soft)", bg: "color-mix(in srgb, var(--text-soft) 12%, white)" },
  normal: { label: "Normaal", color: "var(--navy)", bg: "color-mix(in srgb, var(--navy) 9%, white)" },
  high: { label: "Hoog", color: "var(--orange)", bg: "color-mix(in srgb, var(--orange) 14%, white)" },
  urgent: { label: "Urgent", color: "var(--red)", bg: "color-mix(in srgb, var(--red) 14%, white)" },
};

// Deterministische avatar-kleur per user.
const AVATAR_COLORS = [
  "#0A2A73", "#2563eb", "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#0891b2", "#ca8a04", "#dc2626", "#4f46e5",
];
function avatarColor(id: string | null): string {
  if (!id) return "#94a3b8";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function Avatar({ id, name, size = 22 }: { id: string | null; name: string | null; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ background: avatarColor(id), width: size, height: size, fontSize: size * 0.4 }}
      title={name ?? undefined}
    >
      {initials(name)}
    </span>
  );
}
function fmtDue(iso: string | null): { label: string; tone: string; bg: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const label = d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  if (days < 0) return { label, tone: "var(--red)", bg: "color-mix(in srgb, var(--red) 12%, white)" };
  if (days <= 1) return { label: days === 0 ? "vandaag" : "morgen", tone: "var(--orange)", bg: "color-mix(in srgb, var(--orange) 12%, white)" };
  return { label, tone: "var(--text-muted)", bg: "var(--bg)" };
}

export function BoardClient({
  board,
  columns,
  tasks: initialTasks,
  team,
  currentUserId,
}: {
  board: { id: string; name: string; description: string | null };
  columns: Column[];
  tasks: Task[];
  team: TeamMember[];
  currentUserId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const sortedCols = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  );

  // Member-stack: unieke assignees op het bord.
  const members = useMemo(() => {
    const seen = new Map<string, string | null>();
    for (const t of tasks) if (t.assigneeUserId) seen.set(t.assigneeUserId, t.assigneeName);
    return [...seen.entries()].slice(0, 8);
  }, [tasks]);

  function patchTask(taskId: string, body: Record<string, unknown>) {
    void fetch(`/api/admin/kanban/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destCol = sortedCols.find((c) => c.id === destination.droppableId);
    setTasks((prev) => {
      const moved = prev.find((t) => t.id === draggableId);
      if (!moved) return prev;
      const completedAt = destCol?.isDoneColumn ? new Date().toISOString() : null;
      // Verwijder uit oude positie, voeg in op nieuwe.
      const rest = prev.filter((t) => t.id !== draggableId);
      const inDest = rest
        .filter((t) => t.columnId === destination.droppableId)
        .sort((a, b) => a.position - b.position);
      inDest.splice(destination.index, 0, { ...moved, columnId: destination.droppableId, completedAt });
      const reindexed = inDest.map((t, i) => ({ ...t, position: i }));
      const others = rest.filter((t) => t.columnId !== destination.droppableId);
      return [...others, ...reindexed];
    });
    patchTask(draggableId, { op: "move", columnId: destination.droppableId, position: destination.index });
  }

  async function createTask(columnId: string) {
    const title = newTitle.trim();
    setNewTitle("");
    setAdding(null);
    if (!title) return;
    const res = await fetch(`/api/admin/kanban/boards/${board.id}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ columnId, title }),
    });
    const data = await res.json();
    if (data.success && data.task) {
      setTasks((prev) => [
        ...prev,
        {
          ...data.task,
          assigneeName: null,
          dueAt: data.task.dueAt ?? null,
          completedAt: data.task.completedAt ?? null,
          subtaskCount: 0,
          doneSubtaskCount: 0,
          commentCount: 0,
        },
      ]);
    }
  }

  function applyTaskPatch(taskId: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }
  function removeTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  const selectedTask = tasks.find((t) => t.id === selected) ?? null;

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col bg-[color:var(--bg-deep)]">
      {/* Board-header */}
      <header className="flex items-center gap-4 border-b bg-white px-6 py-3.5">
        <a href="/admin/borden" className="text-sm font-medium text-[color:var(--text-muted)] hover:text-[color:var(--navy)]">
          ← Borden
        </a>
        <div className="h-5 w-px bg-[color:var(--border-soft)]" />
        <h1 className="text-lg font-bold tracking-tight text-[color:var(--navy)]">{board.name}</h1>
        {board.description && (
          <span className="hidden text-sm text-[color:var(--text-muted)] md:inline">· {board.description}</span>
        )}
        <div className="ml-auto flex -space-x-1.5">
          {members.map(([id, name]) => (
            <span key={id} className="ring-2 ring-white rounded-full">
              <Avatar id={id} name={name} size={26} />
            </span>
          ))}
        </div>
      </header>

      {/* Kolommen */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {sortedCols.map((col) => {
            const colTasks = tasks
              .filter((t) => t.columnId === col.id)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={col.id} className="flex w-[19rem] shrink-0 flex-col">
                <div className="mb-3 flex items-center gap-2 px-1">
                  {col.isDoneColumn && (
                    <span className="size-2 rounded-full" style={{ background: "var(--green)" }} />
                  )}
                  <span className="text-[0.8rem] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
                    {col.name}
                  </span>
                  <span className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--text-soft)]">
                    {colTasks.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex min-h-[6rem] flex-1 flex-col gap-2.5 rounded-2xl p-2 transition-colors"
                      style={{
                        background: snapshot.isDraggingOver
                          ? "color-mix(in srgb, var(--navy) 6%, var(--bg))"
                          : "var(--bg)",
                      }}
                    >
                      {colTasks.map((t, idx) => {
                        const due = fmtDue(t.dueAt);
                        const prio = PRIORITY[t.priority];
                        return (
                          <Draggable key={t.id} draggableId={t.id} index={idx}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                onClick={() => setSelected(t.id)}
                                className="group cursor-pointer rounded-xl border border-[color:var(--border-soft)] bg-white p-3 transition"
                                style={{
                                  boxShadow: snap.isDragging
                                    ? "0 12px 28px rgba(10,42,115,0.18)"
                                    : "0 1px 2px rgba(16,24,40,0.04)",
                                  borderLeft: `3px solid ${prio.color}`,
                                  ...prov.draggableProps.style,
                                }}
                              >
                                <p className={`text-sm font-medium leading-snug text-[color:var(--navy)] ${t.completedAt ? "line-through opacity-50" : ""}`}>
                                  {t.title}
                                </p>

                                {t.subtaskCount > 0 && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--bg)]">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${(t.doneSubtaskCount / t.subtaskCount) * 100}%`,
                                          background: "var(--green)",
                                        }}
                                      />
                                    </div>
                                    <span className="text-[0.65rem] font-semibold text-[color:var(--text-soft)]">
                                      {t.doneSubtaskCount}/{t.subtaskCount}
                                    </span>
                                  </div>
                                )}

                                <div className="mt-2.5 flex items-center gap-1.5">
                                  {t.priority !== "normal" && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold"
                                      style={{ background: prio.bg, color: prio.color }}
                                    >
                                      <Flag className="size-2.5" /> {prio.label}
                                    </span>
                                  )}
                                  {due && (
                                    <span
                                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold"
                                      style={{ background: due.bg, color: due.tone }}
                                    >
                                      <CalendarDays className="size-2.5" /> {due.label}
                                    </span>
                                  )}
                                  {t.commentCount > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[0.65rem] font-semibold text-[color:var(--text-soft)]">
                                      <MessageSquare className="size-3" /> {t.commentCount}
                                    </span>
                                  )}
                                  {t.assigneeUserId && (
                                    <span className="ml-auto">
                                      <Avatar id={t.assigneeUserId} name={t.assigneeName} size={22} />
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}

                      {adding === col.id ? (
                        <input
                          autoFocus
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") createTask(col.id);
                            if (e.key === "Escape") { setAdding(null); setNewTitle(""); }
                          }}
                          onBlur={() => createTask(col.id)}
                          placeholder="Taaktitel…"
                          className="w-full rounded-xl border border-[color:var(--navy)] bg-white px-3 py-2 text-sm shadow-sm outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAdding(col.id)}
                          className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-white hover:text-[color:var(--navy)]"
                        >
                          <Plus className="size-4" /> Taak toevoegen
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          columns={sortedCols}
          team={team}
          currentUserId={currentUserId}
          onClose={() => setSelected(null)}
          onPatch={(patch) => applyTaskPatch(selectedTask.id, patch)}
          onArchived={() => { removeTask(selectedTask.id); setSelected(null); }}
          onCountsChanged={(c) => applyTaskPatch(selectedTask.id, c)}
        />
      )}
    </main>
  );
}

// ───── Taak-detail-panel ───────────────────────────────────────────

type Subtask = { id: string; title: string; completedAt: string | null; assigneeName: string | null };
type Comment = { id: string; authorUserId: string; authorName: string | null; body: string; mentions: string[] | null; createdAt: string };

function TaskPanel({
  task,
  columns,
  team,
  currentUserId,
  onClose,
  onPatch,
  onArchived,
  onCountsChanged,
}: {
  task: Task;
  columns: Column[];
  team: TeamMember[];
  currentUserId: string;
  onClose: () => void;
  onPatch: (patch: Partial<Task>) => void;
  onArchived: () => void;
  onCountsChanged: (c: Partial<Task>) => void;
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newSub, setNewSub] = useState("");
  const [comment, setComment] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? "");

  useEffect(() => {
    setTitle(task.title);
    setDesc(task.description ?? "");
    let active = true;
    Promise.all([
      fetch(`/api/admin/kanban/tasks/${task.id}/subtasks`).then((r) => r.json()),
      fetch(`/api/admin/kanban/tasks/${task.id}/comments`).then((r) => r.json()),
    ]).then(([s, c]) => {
      if (!active) return;
      if (s.success) setSubtasks(s.subtasks);
      if (c.success) setComments(c.comments);
    });
    return () => { active = false; };
  }, [task.id]);

  function api(body: Record<string, unknown>) {
    return fetch(`/api/admin/kanban/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function reloadSubs() {
    const s = await fetch(`/api/admin/kanban/tasks/${task.id}/subtasks`).then((r) => r.json());
    if (s.success) {
      setSubtasks(s.subtasks);
      onCountsChanged({
        subtaskCount: s.subtasks.length,
        doneSubtaskCount: s.subtasks.filter((x: Subtask) => x.completedAt).length,
      });
    }
  }

  async function addSubtask() {
    const t = newSub.trim();
    setNewSub("");
    if (!t) return;
    await fetch(`/api/admin/kanban/tasks/${task.id}/subtasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId: task.boardId, title: t }),
    });
    reloadSubs();
  }
  async function toggleSub(sub: Subtask) {
    await fetch(`/api/admin/kanban/tasks/${sub.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "toggle", done: !sub.completedAt }),
    });
    reloadSubs();
  }
  async function postComment() {
    const t = comment.trim();
    if (!t) return;
    setComment("");
    const m = [...mentions];
    setMentions([]);
    await fetch(`/api/admin/kanban/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: t, mentions: m }),
    });
    const c = await fetch(`/api/admin/kanban/tasks/${task.id}/comments`).then((r) => r.json());
    if (c.success) {
      setComments(c.comments);
      onCountsChanged({ commentCount: c.comments.length });
    }
  }

  const nameById = new Map(team.map((m) => [m.id, m.name]));
  const assignee = team.find((m) => m.id === task.assigneeUserId);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/30 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Taak</span>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]">
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== task.title) { onPatch({ title: title.trim() }); void api({ title: title.trim() }); } }}
            rows={Math.max(1, Math.ceil(title.length / 36))}
            className="w-full resize-none rounded-lg border border-transparent px-2 py-1 text-lg font-bold leading-snug text-[color:var(--navy)] hover:border-[color:var(--border-soft)] focus:border-[color:var(--navy)] focus:outline-none"
          />

          {/* Meta-grid */}
          <div className="mt-3 space-y-2.5">
            <MetaRow label="Toegewezen">
              <div className="flex items-center gap-2">
                {task.assigneeUserId && <Avatar id={task.assigneeUserId} name={assignee?.name ?? task.assigneeName} size={22} />}
                <select
                  value={task.assigneeUserId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    const name = v ? (nameById.get(v) ?? null) : null;
                    onPatch({ assigneeUserId: v, assigneeName: name });
                    void api({ assigneeUserId: v });
                  }}
                  className="flex-1 rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-sm"
                >
                  <option value="">Niemand</option>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}{m.id === currentUserId ? " (ik)" : ""}</option>
                  ))}
                </select>
              </div>
            </MetaRow>
            <MetaRow label="Prioriteit">
              <select
                value={task.priority}
                onChange={(e) => { const p = e.target.value as Task["priority"]; onPatch({ priority: p }); void api({ priority: p }); }}
                className="w-full rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-sm"
              >
                {(["low", "normal", "high", "urgent"] as const).map((p) => (
                  <option key={p} value={p}>{PRIORITY[p].label}</option>
                ))}
              </select>
            </MetaRow>
            <MetaRow label="Deadline">
              <input
                type="date"
                defaultValue={task.dueAt ? task.dueAt.slice(0, 10) : ""}
                onChange={(e) => { const v = e.target.value || null; onPatch({ dueAt: v ? new Date(v).toISOString() : null }); void api({ dueAt: v }); }}
                className="w-full rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-sm"
              />
            </MetaRow>
            <MetaRow label="Kolom">
              <select
                value={task.columnId ?? ""}
                onChange={(e) => { onPatch({ columnId: e.target.value }); void api({ op: "move", columnId: e.target.value, position: 0 }); }}
                className="w-full rounded-md border border-[color:var(--border-soft)] bg-white px-2 py-1 text-sm"
              >
                {columns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </MetaRow>
          </div>

          <div className="mt-4">
            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Omschrijving</p>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => { if (desc !== (task.description ?? "")) { onPatch({ description: desc }); void api({ description: desc }); } }}
              rows={3}
              placeholder="Voeg details toe…"
              className="w-full rounded-lg border border-[color:var(--border-soft)] px-2.5 py-2 text-sm"
            />
          </div>

          {/* Subtaken */}
          <div className="mt-5">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Subtaken {subtasks.length > 0 && `· ${subtasks.filter((s) => s.completedAt).length}/${subtasks.length}`}
            </p>
            <div className="space-y-1.5">
              {subtasks.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-[color:var(--bg)]">
                  <input type="checkbox" checked={!!s.completedAt} onChange={() => toggleSub(s)} className="size-4 rounded" />
                  <span className={s.completedAt ? "text-[color:var(--text-soft)] line-through" : "text-[color:var(--navy)]"}>{s.title}</span>
                </label>
              ))}
            </div>
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubtask()}
              placeholder="+ subtaak toevoegen"
              className="mt-2 w-full rounded-lg border border-[color:var(--border-soft)] px-2.5 py-1.5 text-sm"
            />
          </div>

          {/* Reacties */}
          <div className="mt-6">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Reacties</p>
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar id={c.authorUserId} name={c.authorName} size={26} />
                  <div className="flex-1 rounded-lg rounded-tl-sm bg-[color:var(--bg)] px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-[color:var(--navy)]">{c.authorName ?? "?"}</span>
                      <span className="text-[0.65rem] text-[color:var(--text-soft)]">
                        {new Date(c.createdAt).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[color:var(--navy)]">{c.body}</p>
                    {c.mentions && c.mentions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.mentions.map((id) => (
                          <span key={id} className="rounded-md bg-[color:color-mix(in_srgb,var(--navy)_12%,white)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[color:var(--navy)]">
                            @{nameById.get(id) ?? "?"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-[color:var(--text-soft)]">Nog geen reacties.</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {team.filter((m) => m.id !== currentUserId).map((m) => {
                const on = mentions.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMentions((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                    className="rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold transition"
                    style={{
                      borderColor: on ? "var(--navy)" : "var(--border-soft)",
                      background: on ? "var(--navy)" : "transparent",
                      color: on ? "white" : "var(--text-muted)",
                    }}
                  >
                    @{m.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && postComment()}
                placeholder="Schrijf een reactie…"
                className="flex-1 rounded-lg border border-[color:var(--border-soft)] px-3 py-2 text-sm"
              />
              <button type="button" onClick={postComment} className="rounded-lg bg-[color:var(--navy)] px-3 text-white">
                <Send className="size-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm("Taak archiveren?")) { void api({ op: "archive" }); onArchived(); }
            }}
            className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--red)] hover:underline"
          >
            <Archive className="size-4" /> Archiveer taak
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
