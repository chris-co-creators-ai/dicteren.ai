"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { KbSearchItem } from "@/lib/content/kennisbank/types";

export function KbSearch({ items }: { items: KbSearchItem[] }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return items
      .filter(
        (i) =>
          i.title.toLowerCase().includes(term) ||
          i.summary.toLowerCase().includes(term) ||
          i.category.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [q, items]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3.5 py-3 focus-within:border-[color:var(--navy)]">
        <Search className="size-5 shrink-0 text-[color:var(--text-muted)]" strokeWidth={2.2} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek hulp, bijvoorbeeld: opzeggen"
          aria-label="Zoek in de kennisbank"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[color:var(--text-muted)]"
        />
      </div>

      {results.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-white shadow-lg">
          {results.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="block border-b border-[color:var(--border-soft)] px-4 py-3 last:border-b-0 hover:bg-[color:var(--bg-soft,#f6f7f9)]"
              >
                <span className="block text-[15px] font-semibold text-[color:var(--navy)]">
                  {r.title}
                </span>
                <span className="mt-0.5 block text-[13px] text-[color:var(--text-muted)]">
                  {r.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {q.trim().length >= 2 && results.length === 0 && (
        <p className="absolute z-20 mt-2 w-full rounded-xl border border-[color:var(--border)] bg-white px-4 py-3 text-[14px] text-[color:var(--text-muted)] shadow-lg">
          Niks gevonden. Mail ons gerust op{" "}
          <a href="mailto:info@dicteren.ai" className="font-semibold underline">
            info@dicteren.ai
          </a>
          .
        </p>
      )}
    </div>
  );
}
