"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };

const PRIMARY_NAV: NavItem[] = [
  { label: "Product", href: "/product/ai-tools" },
  { label: "Voor wie", href: "/voor-wie/ondernemers" },
  { label: "Zakelijk", href: "/zakelijk" },
  { label: "Prijzen", href: "/prijzen" },
  { label: "Download", href: "/download" },
  { label: "Blog", href: "/blog" },
  { label: "Help", href: "/help" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data, isPending } = authClient.useSession();
  const user = data?.user;
  const isAdmin = user?.role === "admin";

  const desktopAuthCta = isPending ? null : user ? (
    <Link
      href={isAdmin ? "/admin" : "/"}
      className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
    >
      <LayoutDashboard className="size-3.5" strokeWidth={2} />
      {isAdmin ? "Admin" : user.name?.split(" ")[0] || "Account"}
    </Link>
  ) : (
    <Link
      href="/auth/sign-in"
      className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
    >
      <LogIn className="size-3.5" strokeWidth={2} />
      Inloggen
    </Link>
  );

  const mobileAuthCta = isPending ? null : user ? (
    <Link
      href={isAdmin ? "/admin" : "/"}
      onClick={() => setOpen(false)}
      className="btn btn-secondary w-full"
    >
      {isAdmin ? "Open admin" : "Mijn account"}
    </Link>
  ) : (
    <Link
      href="/auth/sign-in"
      onClick={() => setOpen(false)}
      className="btn btn-secondary w-full"
    >
      Inloggen
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[color:var(--border-soft)] bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Logo height={32} />

        <nav
          aria-label="Hoofdnavigatie"
          className="hidden items-center gap-1 md:flex"
        >
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-deep)] hover:text-[color:var(--navy)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {desktopAuthCta}
          <Link
            href="/auth/sign-up?next=/trial/start"
            className="btn btn-primary btn-sm"
          >
            Start gratis trial
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Menu sluiten" : "Menu openen"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 text-[color:var(--navy)] hover:bg-[color:var(--bg-deep)] md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-[color:var(--border-soft)] bg-white md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-base font-medium text-[color:var(--text)] hover:bg-[color:var(--bg-deep)]"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-[color:var(--border-soft)] pt-4">
            {mobileAuthCta}
            <Link
              href="/auth/sign-up?next=/trial/start"
              onClick={() => setOpen(false)}
              className="btn btn-primary w-full"
            >
              Start gratis trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
