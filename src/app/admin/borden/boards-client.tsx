"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Lock, Users, LayoutGrid, ArrowUpDown } from "lucide-react";

type Board = {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  ownerName: string | null;
  visibility: "shared" | "private";
  color: string | null;
  openTaskCount: number;
  createdAt: string;
};

// Sorteerkeuze voor de borden-lijst. Per gebruiker onthouden in localStorage;
// default alfabetisch (vraag van de AM's: voorspelbare volgorde).
type SortKey = "name" | "tasks" | "newest";

const SORT_STORAGE_KEY = "borden:sort";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Naam A→Z" },
  { key: "tasks", label: "Meeste open taken" },
  { key: "newest", label: "Nieuwste eerst" },
];

function sortBoards(list: Board[], sort: SortKey): Board[] {
  const arr = [...list];
  const byName = (a: Board, b: Board) =>
    a.name.localeCompare(b.name, "nl", { sensitivity: "base" });
  switch (sort) {
    case "name":
      arr.sort(byName);
      break;
    case "tasks":
      arr.sort((a, b) => b.openTaskCount - a.openTaskCount || byName(a, b));
      break;
    case "newest":
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
  }
  return arr;
}

export function BoardsClient({
  boards,
  currentUserId,
}: {
  boards: Board[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"shared" | "private">("shared");
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");

  // Opgeslagen voorkeur pas ná mount lezen (localStorage bestaat niet op de server).
  useEffect(() => {
    const saved = window.localStorage.getItem(SORT_STORAGE_KEY);
    if (saved === "name" || saved === "tasks" || saved === "newest") {
      setSort(saved);
    }
  }, []);

  function changeSort(next: SortKey) {
    setSort(next);
    window.localStorage.setItem(SORT_STORAGE_KEY, next);
  }

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/kanban/boards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), visibility }),
      });
      const data = await res.json();
      if (data.success && data.board) {
        router.push(`/admin/borden/${data.board.id}`);
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  const shared = sortBoards(
    boards.filter((b) => b.visibility === "shared"),
    sort,
  );
  const mine = sortBoards(
    boards.filter(
      (b) => b.visibility === "private" && b.ownerUserId === currentUserId,
    ),
    sort,
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="size-4" /> Nieuw bord
        </button>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="size-3.5 text-[color:var(--text-muted)]" />
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => changeSort(o.key)}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
              style={{
                borderColor:
                  sort === o.key ? "var(--navy)" : "var(--border-soft)",
                background: sort === o.key ? "var(--bg)" : "transparent",
                color: "var(--navy)",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <Section title="Gedeelde borden" icon={Users} boards={shared} />
      {mine.length > 0 && (
        <Section title="Mijn privé-borden" icon={Lock} boards={mine} />
      )}
      {boards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nog geen borden. Maak er een aan om te beginnen.
        </p>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setCreating(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[color:var(--navy)]">
              Nieuw bord
            </h2>
            <label className="mt-4 block text-sm font-semibold text-[color:var(--navy)]">
              Naam
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="bv. Dashboard, CRM, Content…"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border-soft)" }}
            />
            <label className="mt-4 block text-sm font-semibold text-[color:var(--navy)]">
              Zichtbaarheid
            </label>
            <div className="mt-1 flex gap-2">
              {(["shared", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{
                    borderColor:
                      visibility === v ? "var(--navy)" : "var(--border-soft)",
                    background: visibility === v ? "var(--bg)" : "transparent",
                    color: "var(--navy)",
                  }}
                >
                  {v === "shared" ? "Gedeeld (team)" : "Privé"}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                disabled={busy}
                className="rounded-lg border px-4 py-2 text-sm font-semibold text-[color:var(--navy)] disabled:opacity-50"
                style={{ borderColor: "var(--border-soft)" }}
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={create}
                disabled={busy || !name.trim()}
                className="rounded-lg bg-[color:var(--navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Bezig…" : "Maak bord"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  icon: Icon,
  boards,
}: {
  title: string;
  icon: typeof Users;
  boards: Board[];
}) {
  if (boards.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--text-muted)]">
        <Icon className="size-4" /> {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((b) => (
          <Link
            key={b.id}
            href={`/admin/borden/${b.id}`}
            className="rounded-2xl border bg-card p-4 transition hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-4 text-[color:var(--text-muted)]" />
              <span className="font-semibold text-[color:var(--navy)]">
                {b.name}
              </span>
            </div>
            {b.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {b.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{b.openTaskCount} open taken</span>
              <span>· {b.ownerName ?? "?"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
