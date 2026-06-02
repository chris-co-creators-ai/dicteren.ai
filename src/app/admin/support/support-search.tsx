"use client";

// Dicteren.ai — Support zoek-ingang. Vrije term → klant → cockpit-deeplink.

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, Loader2 } from "lucide-react";

type Match = {
  userId: string;
  name: string;
  email: string;
  matchedOn: string;
};

export function SupportSearch() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/support/search?q=${encodeURIComponent(q.trim())}`,
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setMatches(data.matches as Match[]);
      } else {
        setError(data.error ?? "Zoeken mislukt");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder="E-mail, naam, licentiecode, order-id of apparaat-fingerprint"
            className="w-full rounded-lg border border-[color:var(--border-soft)] py-2.5 pl-10 pr-3 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || q.trim().length < 2}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--navy)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Zoek"}
        </button>
      </form>

      {error && (
        <div
          className="rounded-lg px-3 py-2 text-sm font-medium"
          style={{
            background: "color-mix(in srgb, var(--red) 12%, white)",
            color: "var(--red)",
          }}
        >
          {error}
        </div>
      )}

      {matches && matches.length === 0 && (
        <div className="text-sm text-[color:var(--text-muted)]">
          Geen klant gevonden voor deze zoekterm.
        </div>
      )}

      {matches && matches.length > 0 && (
        <div className="divide-y divide-[color:var(--border-soft)] rounded-xl border border-[color:var(--border-soft)] bg-white">
          {matches.map((m) => (
            <Link
              key={m.userId}
              href={`/admin/crm/${m.userId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[color:var(--surface-2)]"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="truncate text-xs text-[color:var(--text-muted)]">
                  {m.email} · match op {m.matchedOn}
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-[color:var(--text-muted)]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
