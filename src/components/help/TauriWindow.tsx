import { type ReactNode } from "react";

type Props = {
  title?: string;
  platform?: "mac" | "windows";
  children: ReactNode;
  className?: string;
};

export function TauriWindow({
  title = "Dicteren.ai",
  platform = "mac",
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-xl ${className}`}
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-3 border-b px-3 py-2"
        style={{
          borderColor: "var(--border)",
          background: "linear-gradient(180deg, #f7f7f8 0%, #ececef 100%)",
        }}
      >
        {platform === "mac" ? (
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
        ) : (
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--text)]">
              {title}
            </span>
            <div className="flex gap-1 text-xs text-[color:var(--text-muted)]">
              <span className="px-2">_</span>
              <span className="px-2">□</span>
              <span className="px-2">✕</span>
            </div>
          </div>
        )}
        {platform === "mac" && (
          <span className="ml-2 text-xs font-medium text-[color:var(--text-muted)]">
            {title}
          </span>
        )}
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}
