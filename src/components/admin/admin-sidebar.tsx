"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  Calculator,
  CalendarRange,
  GitBranch,
  HeartHandshake,
  Home,
  Inbox,
  Key,
  LayoutGrid,
  ListChecks,
  Mail,
  Menu,
  Sparkles,
  Receipt,
  Scale,
  Settings,
  Tag,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

type Role = "admin" | "account_manager" | string;

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  badgeKey?: "messages" | "affiliates" | "pastDue";
  badgeAlert?: boolean;
  roles: Role[];
};

const BOTH: Role[] = ["admin", "account_manager"];
const ADMIN_ONLY: Role[] = ["admin"];

const NAV: NavItem[] = [
  { href: "/admin", label: "Overzicht", icon: Home, roles: BOTH },
  { href: "/admin/taken", label: "Taken", icon: ListChecks, roles: BOTH },
  { href: "/admin/borden", label: "Borden", icon: LayoutGrid, roles: BOTH },
  { href: "/admin/pi", label: "Pi", icon: Sparkles, roles: BOTH },
  { href: "/admin/content", label: "Content", icon: CalendarRange, roles: BOTH },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: BOTH },
  { href: "/admin/crm", label: "CRM", icon: Users, roles: BOTH },
  { href: "/admin/users", label: "Users", icon: UserCog, roles: BOTH },
  {
    href: "/admin/messages",
    label: "Berichten",
    icon: Inbox,
    badgeKey: "messages",
    roles: BOTH,
  },
  { href: "/admin/licenses", label: "Licenties", icon: Key, roles: BOTH },
  { href: "/admin/organizations", label: "Organisaties", icon: Building2, roles: BOTH },
  { href: "/admin/orders", label: "Orders", icon: Receipt, roles: BOTH },
  { href: "/admin/invoices", label: "Facturen", icon: Tag, roles: BOTH },
  { href: "/admin/pricing", label: "Prijzen & marge", icon: Calculator, roles: BOTH },
  { href: "/admin/discounts", label: "Kortingen", icon: Scale, roles: BOTH },
  {
    href: "/admin/affiliates",
    label: "Affiliates",
    icon: GitBranch,
    badgeKey: "affiliates",
    roles: BOTH,
  },
  { href: "/admin/partners", label: "Partners", icon: HeartHandshake, roles: BOTH },
  { href: "/admin/emails", label: "E-mails", icon: Mail, roles: BOTH },
  { href: "/admin/support", label: "Support", icon: Bell, roles: BOTH },
  { href: "/admin/settings", label: "Instellingen", icon: Settings, roles: BOTH },
];

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  account_manager: "Account Manager",
  owner: "Eigenaar",
  support: "Support",
};

export function AdminSidebar({
  user,
  badges,
  role,
  blockedPaths,
}: {
  user: { name: string; email: string; role?: string | null };
  badges?: { messages: number; affiliates: number; pastDue: number };
  role?: string;
  blockedPaths?: string[];
}) {
  const effectiveRole = role ?? user.role ?? "user";
  const blocks = new Set(blockedPaths ?? []);
  const visibleNav = NAV.filter(
    (n) => n.roles.includes(effectiveRole) && !blocks.has(n.href),
  );
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user.name?.trim() || user.email.split("@")[0];
  const roleLabel = user.role ? ROLE_LABEL[user.role] ?? user.role : "Gebruiker";

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu openen"
        className="fixed left-4 top-4 z-40 grid size-10 place-items-center rounded-xl border border-[color:var(--border-soft)] bg-white shadow-sm lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[color:var(--border-soft)] bg-white p-3.5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-58 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center gap-2 px-1.5 pt-1">
          <LogoIcon size={26} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-[color:var(--navy)]">
              Dicteren.ai
            </div>
            <div className="font-mono text-[0.625rem] text-[color:var(--text-soft)]">
              ADMIN · v0.7
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 hover:bg-[color:var(--bg-deep)] lg:hidden"
            aria-label="Menu sluiten"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg py-2 pr-2.5 text-sm transition-colors",
                  active
                    ? "border-l-[3px] border-[color:var(--orange)] bg-[color:var(--orange-50)] pl-2 font-semibold text-[color:var(--orange-600)]"
                    : "border-l-[3px] border-transparent pl-2.5 font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--bg-deep)] hover:text-[color:var(--navy)]",
                )}
              >
                <Icon
                  className="size-4"
                  strokeWidth={1.8}
                  style={{
                    color: active
                      ? "var(--orange-600)"
                      : "var(--text-muted)",
                  }}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badgeKey && badges && badges[item.badgeKey] > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[0.625rem] font-bold leading-5",
                      "bg-[color:var(--orange)] text-white",
                    )}
                  >
                    {badges[item.badgeKey]}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-3 border-t border-[color:var(--border-soft)] pt-3">
          {menuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-[color:var(--border-soft)] bg-white p-1.5"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              <div className="px-3 py-2 text-[0.6875rem] text-[color:var(--text-muted)]">
                Ingelogd als
                <div
                  className="mt-0.5 truncate text-xs font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  {user.email}
                </div>
              </div>
              <div className="my-1 h-px bg-[color:var(--border-soft)]" />
              <Link
                href="/admin/settings"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[color:var(--text)] hover:bg-[color:var(--bg-deep)]"
              >
                <Settings className="size-3.5" strokeWidth={2} />
                Instellingen
              </Link>
              <SignOutButton variant="menuItem" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-[color:var(--bg-deep)]"
          >
            <div
              className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: "var(--navy)" }}
            >
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{displayName}</div>
              <div className="text-[0.625rem] text-[color:var(--text-soft)]">
                {roleLabel}
              </div>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
