"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  Camera,
  Video,
  Music2,
  Ghost,
  Mail,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PostPanel } from "./post-panel";

// ── Types ────────────────────────────────────────────────────────────────────
export type Space = {
  id: string;
  name: string;
  kind: "internal" | "affiliate";
  affiliateName: string | null;
};
export type TeamMember = { id: string; name: string };
export type Channel =
  | "linkedin"
  | "instagram"
  | "tiktok"
  | "snapchat"
  | "youtube"
  | "email_flow"
  | "blog_article";
export type PostStatus = "idea" | "draft" | "scheduled" | "published" | "cancelled";

export type CalendarPost = {
  id: string;
  spaceId: string;
  spaceName: string;
  channel: Channel;
  title: string;
  status: PostStatus;
  scheduledAt: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  thumbnailUrl: string | null;
};

// ── Channel-config (icoon + kleur) ───────────────────────────────────────────
export const CHANNELS: Record<
  Channel,
  { label: string; color: string; Icon: typeof Briefcase }
> = {
  linkedin: { label: "LinkedIn", color: "#0a66c2", Icon: Briefcase },
  instagram: { label: "Instagram", color: "#d6249f", Icon: Camera },
  tiktok: { label: "TikTok", color: "#111111", Icon: Music2 },
  snapchat: { label: "Snapchat", color: "#fbbf24", Icon: Ghost },
  youtube: { label: "YouTube", color: "#ff0000", Icon: Video },
  email_flow: { label: "E-mailflow", color: "#f97316", Icon: Mail },
  blog_article: { label: "Blogartikel", color: "#0d9488", Icon: FileText },
};

const STATUS_LABEL: Record<PostStatus, string> = {
  idea: "Idee",
  draft: "Concept",
  scheduled: "Gepland",
  published: "Gepubliceerd",
  cancelled: "Geannuleerd",
};

// ── Datum-helpers (pure, geen externe lib) ───────────────────────────────────
const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
// Maandag = start van de week.
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  return addDays(x, -day);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isoWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 4 - ((x.getDay() + 6) % 7));
  const yearStart = new Date(x.getFullYear(), 0, 1);
  return Math.ceil(((x.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type View = "month" | "week" | "day";

// ── Component ─────────────────────────────────────────────────────────────────
export function ContentClient({
  spaces,
  team,
}: {
  spaces: Space[];
  team: TeamMember[];
}) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()));
  const [spaceFilter, setSpaceFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<
    { mode: "new"; date: Date | null } | { mode: "edit"; id: string } | null
  >(null);

  // Het zichtbare datumbereik op basis van de view.
  const range = useMemo(() => {
    if (view === "month") {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const from = startOfWeek(first);
      return { from, to: addDays(from, 42) };
    }
    if (view === "week") {
      const from = startOfWeek(cursor);
      return { from, to: addDays(from, 7) };
    }
    const from = startOfDay(cursor);
    return { from, to: addDays(from, 1) };
  }, [view, cursor]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      if (spaceFilter) params.set("space", spaceFilter);
      if (channelFilter) params.set("channel", channelFilter);
      if (assigneeFilter) params.set("assignee", assigneeFilter);
      const res = await fetch(`/api/admin/content/calendar?${params}`);
      const data = await res.json();
      if (data.success) setPosts(data.posts);
      else toast.error(data.error ?? "Laden mislukt");
    } catch {
      toast.error("Laden mislukt");
    } finally {
      setLoading(false);
    }
  }, [range, spaceFilter, channelFilter, assigneeFilter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      if (!p.scheduledAt) continue;
      const key = startOfDay(new Date(p.scheduledAt)).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  function shift(dir: -1 | 1) {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  }

  const headerLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "week") {
      const ws = startOfWeek(cursor);
      return `Week ${isoWeek(cursor)} · ${ws.getDate()} ${MONTHS[ws.getMonth()]}`;
    }
    return `${cursor.getDate()} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  }, [view, cursor]);

  return (
    <div className="space-y-4">
      {/* Header: navigatie + view-knoppen + filters + nieuw */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>
            Vandaag
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="ml-2 text-lg font-semibold capitalize">{headerLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm capitalize ${
                  view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {v === "month" ? "Maand" : v === "week" ? "Week" : "Dag"}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setPanel({ mode: "new", date: startOfDay(cursor) })}>
            <Plus className="size-4" /> Nieuwe post
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterSelect value={spaceFilter} onChange={setSpaceFilter} label="Alle ruimtes">
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={channelFilter} onChange={setChannelFilter} label="Alle kanalen">
          {(Object.keys(CHANNELS) as Channel[]).map((c) => (
            <option key={c} value={c}>
              {CHANNELS[c].label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={assigneeFilter} onChange={setAssigneeFilter} label="Alle AM's">
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </FilterSelect>
        {loading && <span className="self-center text-xs text-muted-foreground">Laden…</span>}
      </div>

      {/* Views */}
      {view === "month" && (
        <MonthView
          range={range}
          cursorMonth={cursor.getMonth()}
          postsByDay={postsByDay}
          onDayClick={(d) => setPanel({ mode: "new", date: d })}
          onPostClick={(id) => setPanel({ mode: "edit", id })}
        />
      )}
      {view === "week" && (
        <WeekView
          range={range}
          postsByDay={postsByDay}
          onDayClick={(d) => setPanel({ mode: "new", date: d })}
          onPostClick={(id) => setPanel({ mode: "edit", id })}
        />
      )}
      {view === "day" && (
        <DayView
          day={cursor}
          posts={postsByDay.get(startOfDay(cursor).toDateString()) ?? []}
          onSlotClick={(d) => setPanel({ mode: "new", date: d })}
          onPostClick={(id) => setPanel({ mode: "edit", id })}
        />
      )}

      {panel && (
        <PostPanel
          key={panel.mode === "edit" ? panel.id : "new"}
          spaces={spaces}
          team={team}
          mode={panel.mode}
          postId={panel.mode === "edit" ? panel.id : undefined}
          defaultDate={panel.mode === "new" ? panel.date : null}
          defaultSpaceId={spaceFilter || spaces[0]?.id}
          onClose={() => setPanel(null)}
          onSaved={() => {
            setPanel(null);
            loadPosts();
          }}
        />
      )}
    </div>
  );
}

// ── Filter-select ─────────────────────────────────────────────────────────────
function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border bg-background px-3 text-sm"
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}

// ── Post-chip ─────────────────────────────────────────────────────────────────
function PostChip({
  post,
  onClick,
  showTime,
}: {
  post: CalendarPost;
  onClick: () => void;
  showTime?: boolean;
}) {
  const cfg = CHANNELS[post.channel];
  const Icon = cfg.Icon;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs hover:opacity-90"
      style={{ backgroundColor: `${cfg.color}1a`, borderLeft: `3px solid ${cfg.color}` }}
      title={`${cfg.label} · ${STATUS_LABEL[post.status]}`}
    >
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnailUrl} alt="" className="size-5 shrink-0 rounded object-cover" />
      ) : (
        <Icon className="size-3.5 shrink-0" style={{ color: cfg.color }} />
      )}
      <span className="truncate">
        {showTime && post.scheduledAt && (
          <span className="mr-1 font-medium tabular-nums">{fmtTime(post.scheduledAt)}</span>
        )}
        {post.title}
      </span>
      {post.status === "published" && <span className="ml-auto text-[10px]">✓</span>}
    </button>
  );
}

// ── Maand-view ────────────────────────────────────────────────────────────────
function MonthView({
  range,
  cursorMonth,
  postsByDay,
  onDayClick,
  onPostClick,
}: {
  range: { from: Date; to: Date };
  cursorMonth: number;
  postsByDay: Map<string, CalendarPost[]>;
  onDayClick: (d: Date) => void;
  onPostClick: (id: string) => void;
}) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(range.from, i));
  const today = startOfDay(new Date());
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-xs font-medium">
        {DAYS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const dayPosts = postsByDay.get(d.toDateString()) ?? [];
          const inMonth = d.getMonth() === cursorMonth;
          const isToday = sameDay(d, today);
          return (
            <div
              key={i}
              onClick={() => onDayClick(d)}
              className={`min-h-[104px] cursor-pointer border-b border-r p-1 transition-colors hover:bg-muted/40 ${
                inMonth ? "" : "bg-muted/20 text-muted-foreground"
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-primary font-semibold text-primary-foreground" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((p) => (
                  <PostChip key={p.id} post={p} onClick={() => onPostClick(p.id)} showTime />
                ))}
                {dayPosts.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{dayPosts.length - 3} meer
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week-view ─────────────────────────────────────────────────────────────────
function WeekView({
  range,
  postsByDay,
  onDayClick,
  onPostClick,
}: {
  range: { from: Date; to: Date };
  postsByDay: Map<string, CalendarPost[]>;
  onDayClick: (d: Date) => void;
  onPostClick: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(range.from, i));
  const today = startOfDay(new Date());
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, i) => {
        const dayPosts = postsByDay.get(d.toDateString()) ?? [];
        const isToday = sameDay(d, today);
        return (
          <div
            key={i}
            onClick={() => onDayClick(d)}
            className="min-h-[280px] cursor-pointer rounded-lg border p-2 hover:bg-muted/40"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">{DAYS[i]}</span>
              <span
                className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-primary font-semibold text-primary-foreground" : ""
                }`}
              >
                {d.getDate()}
              </span>
            </div>
            <div className="space-y-1">
              {dayPosts.map((p) => (
                <PostChip key={p.id} post={p} onClick={() => onPostClick(p.id)} showTime />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Dag-view (tijdslijn 08:00–22:00) ─────────────────────────────────────────
function DayView({
  day,
  posts,
  onSlotClick,
  onPostClick,
}: {
  day: Date;
  posts: CalendarPost[];
  onSlotClick: (d: Date) => void;
  onPostClick: (id: string) => void;
}) {
  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8..22
  const byHour = new Map<number, CalendarPost[]>();
  const untimed: CalendarPost[] = [];
  for (const p of posts) {
    if (!p.scheduledAt) continue;
    const h = new Date(p.scheduledAt).getHours();
    if (h < 8 || h > 22) {
      untimed.push(p);
      continue;
    }
    const arr = byHour.get(h) ?? [];
    arr.push(p);
    byHour.set(h, arr);
  }
  return (
    <div className="space-y-2">
      {untimed.length > 0 && (
        <div className="rounded-lg border p-2">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Buiten 08–22</div>
          <div className="space-y-1">
            {untimed.map((p) => (
              <PostChip key={p.id} post={p} onClick={() => onPostClick(p.id)} showTime />
            ))}
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border">
        {hours.map((h) => {
          const slot = new Date(day);
          slot.setHours(h, 0, 0, 0);
          const hourPosts = byHour.get(h) ?? [];
          return (
            <div
              key={h}
              onClick={() => onSlotClick(slot)}
              className="flex cursor-pointer border-b last:border-b-0 hover:bg-muted/40"
            >
              <div className="w-16 shrink-0 border-r px-2 py-3 text-xs tabular-nums text-muted-foreground">
                {String(h).padStart(2, "0")}:00
              </div>
              <div className="flex-1 space-y-1 p-1.5">
                {hourPosts.map((p) => (
                  <PostChip key={p.id} post={p} onClick={() => onPostClick(p.id)} showTime />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
