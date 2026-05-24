"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, LayoutDashboard, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };

const PRIMARY_NAV: NavItem[] = [
  { label: "Voor wie", href: "/voor-wie" },
  { label: "Zakelijk", href: "/zakelijk" },
  { label: "Prijzen", href: "/prijzen" },
  { label: "Help", href: "/help" },
];

type InitialUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

export function SiteHeader({
  initialUser,
}: {
  initialUser?: InitialUser | null;
}) {
  const [open, setOpen] = useState(false);
  const { data, isPending } = authClient.useSession();

  // Use client-session for logged-in/out reactivity (sign-out updates without
  // page-reload), maar bron-van-waarheid voor role is de server-prop. Client
  // session-payload bevat geen role-veld in default Better Auth.
  const clientUser = data?.user;
  const user = clientUser
    ? {
        ...clientUser,
        role: initialUser?.role ?? null,
      }
    : initialUser ?? null;
  const isAdmin = user?.role === "admin";

  const desktopAuthCta = isPending ? null : user ? (
    <Link
      href={isAdmin ? "/admin" : "/account"}
      className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
    >
      <LayoutDashboard className="size-3.5" strokeWidth={2} />
      {isAdmin ? "Inloggen" : user.name?.split(" ")[0] || "Account"}
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
      href={isAdmin ? "/admin" : "/account"}
      onClick={() => setOpen(false)}
      className="btn btn-secondary w-full"
    >
      {isAdmin ? "Inloggen" : "Mijn account"}
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
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Dicteren.ai — naar homepage"
          className="flex items-center gap-3"
        >
          <Image
            src="/branding/app-icon-512.png"
            alt=""
            width={56}
            height={56}
            priority
            className="size-14 rounded-xl"
          />
          <span
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--navy)" }}
          >
            Dicteren<span style={{ color: "var(--orange)" }}>.ai</span>
          </span>
        </Link>

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
            Probeer 14 dagen gratis
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
              Probeer 14 dagen gratis
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
