"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  GitBranch,
  Home,
  Key,
  Menu,
  MoreHorizontal,
  Receipt,
  Scale,
  Settings,
  Tag,
  Users,
  X,
} from "lucide-react";
import { LogoIcon } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Overzicht", icon: Home },
  { href: "/admin/crm", label: "CRM", icon: Users },
  { href: "/admin/licenses", label: "Licenties", icon: Key, badge: 142 },
  { href: "/admin/organizations", label: "Organisaties", icon: Building2 },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/invoices", label: "Facturen", icon: Tag },
  { href: "/admin/discounts", label: "Kortingen", icon: Scale },
  { href: "/admin/affiliates", label: "Affiliates", icon: GitBranch },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/support", label: "Support", icon: Bell, badge: 7 },
  { href: "/admin/settings", label: "Instellingen", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu openen"
        className="fixed left-4 top-4 z-40 grid size-10 place-items-center rounded-xl border border-[color:var(--border-soft)] bg-white shadow-sm lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile backdrop */}
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
          {NAV.map((item) => {
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
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[0.625rem] font-bold leading-5",
                      active
                        ? "bg-[color:var(--orange)] text-white"
                        : "bg-[color:var(--bg-deep)] text-[color:var(--text-muted)]",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 flex items-center gap-2.5 border-t border-[color:var(--border-soft)] pt-3">
          <div
            className="grid size-8 place-items-center rounded-full text-xs font-bold text-white"
            style={{ background: "var(--navy)" }}
          >
            CR
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">Christian</div>
            <div className="text-[0.625rem] text-[color:var(--text-soft)]">
              Eigenaar
            </div>
          </div>
          <button
            type="button"
            aria-label="Meer opties"
            className="rounded-md p-1 hover:bg-[color:var(--bg-deep)]"
          >
            <MoreHorizontal
              className="size-3.5"
              strokeWidth={2}
              style={{ color: "var(--text-soft)" }}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
