"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export function SignOutButton({
  variant = "ghost",
  label = "Uitloggen",
  className,
}: {
  variant?: "ghost" | "secondary" | "menuItem";
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut();
    } catch (err) {
      console.warn("sign-out failed", err);
    }
    router.push("/auth/sign-in");
    router.refresh();
  }

  const base =
    variant === "menuItem"
      ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[color:var(--text)] hover:bg-[color:var(--bg-deep)]"
      : variant === "secondary"
      ? "btn btn-secondary btn-sm"
      : "inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--navy)]";

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className={[base, className].filter(Boolean).join(" ")}
    >
      <LogOut className="size-3.5" strokeWidth={2} />
      {pending ? "Bezig…" : label}
    </button>
  );
}
