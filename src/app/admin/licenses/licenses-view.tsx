"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Filter,
  MoreHorizontal,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";

type License = {
  id: string;
  code: string;
  type: string;
  status: string;
  seats: number;
  activationCount: number;
  userEmail: string | null;
  planSlug: string | null;
  issuedAt: string;
  expiresAt: string | null;
};

type Kpi = { label: string; value: string; detail: string };

type UiStatus = "active" | "unused" | "expired" | "revoked" | "refunded";
type TabKey = "all" | UiStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "active", label: "Actief" },
  { key: "unused", label: "Ongebruikt" },
  { key: "expired", label: "Verlopen" },
  { key: "refunded", label: "Terugbetaald" },
  { key: "revoked", label: "Ingetrokken" },
];

const STATUS_META: Record<UiStatus, { label: string; chip: string; dot: string }> = {
  active: { label: "Actief", chip: "chip-green", dot: "var(--green)" },
  unused: { label: "Ongebruikt", chip: "chip-navy", dot: "var(--navy-300)" },
  expired: { label: "Verlopen", chip: "chip-orange", dot: "var(--orange)" },
  refunded: { label: "Terugbetaald", chip: "chip-navy", dot: "var(--navy-300)" },
  revoked: { label: "Ingetrokken", chip: "chip-red", dot: "var(--red)" },
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  consumer: { label: "Persoonlijk", color: "var(--orange-600)" },
  team: { label: "Zakelijk", color: "var(--navy)" },
};

function uiStatusFor(l: License): UiStatus {
  if (l.status === "revoked") return "revoked";
  if (l.status === "refunded") return "refunded";
  if (l.status === "expired" || l.status === "canceled") return "expired";
  if (l.status === "active" && l.activationCount === 0) return "unused";
  if (l.status === "trial" && l.activationCount === 0) return "unused";
  if (l.status === "active" || l.status === "trial") return "active";
  return "expired";
}

function StatusPill({ ui }: { ui: UiStatus }) {
  const m = STATUS_META[ui];
  return (
    <span className={`chip ${m.chip} gap-1.5 px-2 py-0.5 text-[0.625rem]`}>
      <span
        aria-hidden
        className="inline-block size-1.5 rounded-full"
        style={{ background: m.dot }}
      />
      {m.label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LicensesView({
  licenses,
  kpis,
}: {
  licenses: License[];
  kpis: Kpi[];
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<License | null>(null);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: licenses.length,
      active: 0,
      unused: 0,
      expired: 0,
      refunded: 0,
      revoked: 0,
    };
    for (const l of licenses) c[uiStatusFor(l)]++;
    return c;
  }, [licenses]);

  const filtered = useMemo(
    () =>
      licenses.filter((r) => {
        if (tab !== "all" && uiStatusFor(r) !== tab) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.code.toLowerCase().includes(q) ||
            (r.userEmail?.toLowerCase().includes(q) ?? false)
          );
        }
        return true;
      }),
    [tab, search, licenses],
  );

  return (
    <>
      <AdminTopbar
        actions={
          <button className="btn btn-secondary btn-sm">
            <Upload className="size-3" strokeWidth={2.2} />
            Exporteer CSV
          </button>
        }
      />

      <div className="flex flex-col gap-5 px-5 py-7 lg:px-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.625rem]">
            Licenties
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Live data uit Neon · actuele activaties en vervaldata.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="brand-card p-4">
              <div className="text-[0.6875rem] font-semibold text-[color:var(--text-muted)]">
                {kpi.label}
              </div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{kpi.value}</div>
              <div className="mt-1 text-[0.6875rem] text-[color:var(--text-soft)]">
                {kpi.detail}
              </div>
            </div>
          ))}
        </div>

        <div className="brand-card overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-[color:var(--border-soft)] p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    tab === t.key
                      ? "bg-[color:var(--bg-deep)] font-bold text-[color:var(--navy)]"
                      : "font-medium text-[color:var(--text-muted)] hover:text-[color:var(--navy)]",
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[0.625rem]",
                      tab === t.key
                        ? "bg-white text-[color:var(--text-muted)]"
                        : "bg-[color:var(--bg-deep)] text-[color:var(--text-muted)]",
                    )}
                  >
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
                  strokeWidth={2.2}
                  style={{ color: "var(--text-soft)" }}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek code of e-mail…"
                  className="w-full rounded-lg border border-[color:var(--border-soft)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[color:var(--orange)]"
                  style={{ background: "var(--bg)" }}
                />
              </div>
              <button className="btn btn-secondary btn-sm hidden sm:inline-flex">
                <Filter className="size-3" strokeWidth={2.2} />
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr
                  className="text-[color:var(--text-muted)]"
                  style={{ background: "var(--bg)" }}
                >
                  {[
                    "Code",
                    "Type",
                    "Status",
                    "Toegewezen aan",
                    "Activaties",
                    "Vervalt",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-14 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-sm text-[color:var(--text-muted)]"
                    >
                      Nog geen licenties.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const type = TYPE_META[r.type] ?? {
                      label: r.type,
                      color: "var(--text-muted)",
                    };
                    const ui = uiStatusFor(r);
                    return (
                      <tr
                        key={r.id}
                        className="bg-white"
                        style={{ borderTop: "1px solid var(--border-soft)" }}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs text-[color:var(--navy)]">
                              {r.code}
                            </code>
                            <button
                              title="Kopieer"
                              aria-label="Kopieer code"
                              className="rounded p-1 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)]"
                              onClick={() => {
                                if (typeof navigator !== "undefined") {
                                  void navigator.clipboard?.writeText(r.code);
                                }
                              }}
                            >
                              <Copy className="size-3" strokeWidth={2.2} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: type.color }}
                          >
                            {type.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill ui={ui} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-sm text-[color:var(--text)]">
                            {r.userEmail ?? "Niet toegewezen"}
                          </div>
                          {r.planSlug && (
                            <div className="text-[0.6875rem] text-[color:var(--text-muted)]">
                              {r.planSlug}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-[color:var(--text-muted)]">
                          {r.activationCount} / {r.seats * 2}
                        </td>
                        <td className="px-3 py-3 text-xs text-[color:var(--text-muted)]">
                          {formatDate(r.expiresAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setDrawer(r)}
                            aria-label="Opties"
                            className="rounded p-1.5 text-[color:var(--text-soft)] hover:bg-[color:var(--bg-deep)]"
                          >
                            <MoreHorizontal className="size-4" strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center border-t border-[color:var(--border-soft)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
            <span>
              1–{filtered.length} van {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {drawer && <DetailDrawer license={drawer} onClose={() => setDrawer(null)} />}
    </>
  );
}

function DetailDrawer({
  license,
  onClose,
}: {
  license: License;
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const ui = uiStatusFor(license);
  const type = TYPE_META[license.type] ?? { label: license.type, color: "var(--text-muted)" };
  const fields: { label: string; value: string }[] = [
    { label: "Toegewezen", value: license.userEmail ?? "Niet toegewezen" },
    { label: "Plan", value: license.planSlug ?? "—" },
    { label: "Status", value: license.status },
    { label: "Activaties", value: `${license.activationCount} / ${license.seats * 2}` },
    { label: "Vervalt", value: formatDate(license.expiresAt) },
    { label: "Aangemaakt", value: formatDate(license.issuedAt) },
  ];

  const [replacing, setReplacing] = useState(false);
  const [replaceStatus, setReplaceStatus] = useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);

  const canReplace =
    !license.code.startsWith("DIC-TRIAL-") &&
    license.status !== "revoked" &&
    license.status !== "refunded";

  async function doReplace() {
    const reason = window.prompt(
      `Vervang licentie ${license.code}\n\nOptionele reden (bv. "klant heeft mail niet ontvangen"):`,
      "",
    );
    if (reason === null) return;
    if (
      !window.confirm(
        `Weet je het zeker? De huidige code ${license.code} wordt INGETROKKEN. Alle apparaten worden uitgelogd. De nieuwe code wordt automatisch naar ${license.userEmail ?? "de gekoppelde gebruiker"} gemaild.`,
      )
    ) {
      return;
    }
    setReplacing(true);
    setReplaceStatus(null);
    try {
      const res = await fetch(
        `/api/admin/licenses/${license.id}/replace`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason || undefined }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        setReplaceStatus({ kind: "error", message: data.error ?? "Mislukt" });
      } else {
        setReplaceStatus({
          kind: "ok",
          message: `Nieuwe code: ${data.newCode}. Mail ${data.mailSent ? "verstuurd" : "NIET verstuurd — check /admin/emails"}.`,
        });
        startTransition(() => router.refresh());
      }
    } catch {
      setReplaceStatus({ kind: "error", message: "Netwerkprobleem" });
    } finally {
      setReplacing(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[color:var(--border-soft)] bg-white"
        style={{ boxShadow: "-0.75rem 0 2rem rgba(4, 38, 96, 0.10)" }}
      >
        <div className="flex items-center border-b border-[color:var(--border-soft)] px-5 py-4">
          <div className="min-w-0">
            <div
              className="text-[0.6875rem] font-semibold"
              style={{ color: type.color }}
            >
              {type.label}
            </div>
            <code className="font-mono text-sm text-[color:var(--navy)]">
              {license.code}
            </code>
          </div>
          <button
            onClick={onClose}
            aria-label="Sluit drawer"
            className="ml-auto rounded p-1.5 hover:bg-[color:var(--bg-deep)]"
          >
            <X
              className="size-4"
              strokeWidth={2.2}
              style={{ color: "var(--text-muted)" }}
            />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <StatusPill ui={ui} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div
                key={f.label}
                className="rounded-xl p-3"
                style={{ background: "var(--bg)" }}
              >
                <div className="text-[0.625rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-soft)]">
                  {f.label}
                </div>
                <div className="mt-1 text-sm">{f.value}</div>
              </div>
            ))}
          </div>

          {canReplace && (
            <div className="mt-6 border-t border-[color:var(--border-soft)] pt-5">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[color:var(--text-muted)]">
                Support-actie
              </div>
              <button
                onClick={doReplace}
                disabled={replacing}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold hover:border-[color:var(--orange)] disabled:opacity-60"
              >
                <RotateCcw className="size-3.5" strokeWidth={2.4} />
                {replacing ? "Bezig…" : "Vervang code (oude blokkeren + nieuwe mailen)"}
              </button>
              {replaceStatus && (
                <div
                  className={
                    "mt-2 rounded-md border p-2 text-xs " +
                    (replaceStatus.kind === "ok"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700")
                  }
                >
                  {replaceStatus.message}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
