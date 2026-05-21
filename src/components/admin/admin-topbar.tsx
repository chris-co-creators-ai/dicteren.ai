import { Search } from "lucide-react";

export function AdminTopbar({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--border-soft)] bg-white px-5 py-3.5 lg:px-7">
      <div className="relative ml-12 flex-1 sm:max-w-md lg:ml-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2"
          strokeWidth={2.2}
          style={{ color: "var(--text-soft)" }}
        />
        <input
          type="search"
          placeholder="Zoek licenties, klanten, orders…"
          className="w-full rounded-xl border border-[color:var(--border-soft)] py-2 pl-9 pr-12 text-sm outline-none focus:border-[color:var(--orange)]"
          style={{ background: "var(--bg)" }}
        />
        <span className="brand-kbd absolute right-2 top-1/2 -translate-y-1/2">
          ⌘K
        </span>
      </div>
      {actions && (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
