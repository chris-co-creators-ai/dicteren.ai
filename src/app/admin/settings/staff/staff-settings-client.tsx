"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Save,
  Shield,
  UserCog,
} from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  blockedPaths: string[];
  events: AuditEvent[];
};

type AuditEvent = {
  id: string;
  eventType: string;
  properties: Record<string, unknown> | null;
  occurredAt: string;
};

type PathDef = {
  path: string;
  label: string;
  defaultManagerAccess: boolean;
};

type Props = {
  staff: Staff[];
  allPaths: PathDef[];
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeEvent(e: AuditEvent): string {
  const props = e.properties ?? {};
  const kind = (props as { kind?: string }).kind;
  if (kind) return `${e.eventType.replace(/^audit\./, "")} · ${kind}`;
  return e.eventType.replace(/^audit\./, "");
}

export function StaffSettingsClient({ staff, allPaths }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(staff[0]?.id ?? null);

  return (
    <div className="grid gap-3">
      {staff.length === 0 && (
        <div className="rounded-2xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Nog geen staff-users. Voeg er een toe via{" "}
          <Link href="/admin/users" className="underline">
            /admin/users
          </Link>
          .
        </div>
      )}
      {staff.map((s) => (
        <StaffCard
          key={s.id}
          staff={s}
          allPaths={allPaths}
          open={openId === s.id}
          onToggle={() => setOpenId(openId === s.id ? null : s.id)}
          onSaved={() => startTransition(() => router.refresh())}
        />
      ))}
    </div>
  );
}

function StaffCard({
  staff,
  allPaths,
  open,
  onToggle,
  onSaved,
}: {
  staff: Staff;
  allPaths: PathDef[];
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [blocked, setBlocked] = useState<Set<string>>(
    new Set(staff.blockedPaths),
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = staff.role === "admin";

  function toggle(path: string) {
    const next = new Set(blocked);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setBlocked(next);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff-permissions/${staff.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blockedPaths: Array.from(blocked) }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Opslaan mislukt.");
        setSaving(false);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("nl-NL"));
      onSaved();
    } catch {
      setError("Netwerkprobleem.");
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <span className="grid size-8 place-items-center rounded-full bg-[color:var(--bg-deep)] text-xs font-bold">
            {staff.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || "?"}
          </span>
          <div>
            <div className="font-semibold">{staff.name}</div>
            <div className="text-xs text-muted-foreground">{staff.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-purple-800">
              <Shield className="size-3" strokeWidth={2.4} />
              Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-orange-800">
              <UserCog className="size-3" strokeWidth={2.4} />
              Account Manager
            </span>
          )}
          {!isAdmin && staff.blockedPaths.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.625rem] font-semibold text-red-800">
              {staff.blockedPaths.length} geblokkeerd
            </span>
          )}
          <span className="text-[0.6875rem] text-muted-foreground">
            {staff.events.length} audit-events
          </span>
        </div>
      </button>

      {open && (
        <div className="grid gap-6 border-t p-5 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold">Page-toegang</h3>
            {isAdmin ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Admins hebben automatisch toegang tot alle pages. Geen
                blocks instelbaar.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vink aan om een page te <strong>blokkeren</strong>.
                  Niet-aangevinkt = volledige toegang volgens rol-default.
                </p>
                <ul className="mt-3 grid gap-1">
                  {allPaths.map((p) => {
                    const isBlocked = blocked.has(p.path);
                    return (
                      <li key={p.path}>
                        <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/40">
                          <input
                            type="checkbox"
                            checked={isBlocked}
                            onChange={() => toggle(p.path)}
                          />
                          <span className="flex-1">{p.label}</span>
                          <span className="font-mono text-[0.625rem] text-muted-foreground">
                            {p.path}
                          </span>
                          {isBlocked && (
                            <span className="text-[0.6rem] font-semibold text-red-700">
                              GEBLOKKEERD
                            </span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {error && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {error}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {saving ? (
                      "Opslaan…"
                    ) : (
                      <>
                        <Save className="size-3.5" strokeWidth={2.2} />
                        Opslaan
                      </>
                    )}
                  </button>
                  {savedAt && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                      <Check className="size-3" />
                      Opgeslagen om {savedAt}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold">
              Audit-feed ({staff.events.length} events)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Alle handelingen die {staff.name} in het platform doet —
              live, recent eerst.
            </p>
            {staff.events.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-[color:var(--border-soft)] p-6 text-center text-xs text-muted-foreground">
                Nog geen acties geregistreerd voor deze user.
              </div>
            ) : (
              <ul className="mt-3 max-h-[400px] overflow-y-auto divide-y divide-[color:var(--border-soft)] rounded-xl border">
                {staff.events.map((e) => (
                  <li key={e.id} className="p-3 text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono font-semibold">
                        {describeEvent(e)}
                      </span>
                      <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                        {formatDateTime(e.occurredAt)}
                      </span>
                    </div>
                    {e.properties && Object.keys(e.properties).length > 0 && (
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[0.6875rem] text-muted-foreground">
                        {JSON.stringify(e.properties, null, 0).slice(0, 200)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
