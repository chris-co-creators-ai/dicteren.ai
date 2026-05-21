"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButtonClient({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-soft)] bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-[color:var(--bg-deep)]"
      style={{ color: "var(--navy)" }}
    >
      {copied ? (
        <Check className="size-3.5" strokeWidth={2.4} />
      ) : (
        <Copy className="size-3.5" strokeWidth={2.4} />
      )}
      {copied ? "Gekopieerd" : "Kopieer"}
    </button>
  );
}
