"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Building2,
  Check,
  Copy,
  Gift,
  Infinity as InfinityIcon,
  KeyRound,
  Lock,
  LogOut,
  MoreVertical,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  lastSessionAt: string | null;
  paidLicenseCount: number;
  organizations: Array<{ id: string; name: string; role: string }>;
};

type Props = { users: User[] };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function daysSince(iso: string | null): string {
  if (!iso) return "nooit";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "vandaag";
  if (days === 1) return "1 dag";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mnd`;
  return `${Math.floor(days / 365)}j`;
}

export function UsersClient({ users }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all") {
        if (roleFilter === "admin" && u.role !== "admin") return false;
        if (roleFilter === "account_manager" && u.role !== "account_manager")
          return false;
        if (
          roleFilter === "user" &&
          (u.role === "admin" || u.role === "account_manager")
        )
          return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "verified" && !u.emailVerified) return false;
        if (statusFilter === "unverified" && u.emailVerified) return false;
        if (statusFilter === "banned" && !u.banned) return false;
        if (statusFilter === "paying" && u.paidLicenseCount === 0) return false;
        if (statusFilter === "in-org" && u.organizations.length === 0)
          return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.organizations.some((o) => o.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  async function performAction(
    userId: string,
    action: string,
    extra?: Record<string, unknown>,
    confirmMessage?: string,
    successMessage?: string,
  ) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setBusy(`${userId}:${action}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: action === "delete" ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body:
          action === "delete"
            ? undefined
            : JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!data.success) {
        setToast(`Fout: ${data.error ?? "actie mislukt"}`);
      } else {
        setToast(successMessage ?? "Klaar.");
        if (action === "impersonate" && data.redirectTo) {
          window.location.href = data.redirectTo;
          return;
        }
        startTransition(() => router.refresh());
      }
    } catch {
      setToast("Netwerkprobleem — probeer opnieuw.");
    }
    setBusy(null);
    setOpenMenuId(null);
    setTimeout(() => setToast(null), 4000);
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setToast(`Email gekopieerd: ${email}`);
      setTimeout(() => setToast(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2.2}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek naam, email, org…"
            className="w-full rounded-lg border bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-orange-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border bg-card py-2 px-3 text-sm"
        >
          <option value="all">Alle rollen</option>
          <option value="user">Gebruiker</option>
          <option value="account_manager">Account Manager</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-card py-2 px-3 text-sm"
        >
          <option value="all">Alle statussen</option>
          <option value="verified">Email geverifieerd</option>
          <option value="unverified">Niet geverifieerd</option>
          <option value="banned">Banned</option>
          <option value="paying">Betalend (paid license)</option>
          <option value="in-org">Lid van organisatie</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} van {users.length} users
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Org</th>
              <th className="px-3 py-3">Licenties</th>
              <th className="px-3 py-3">Aangemaakt</th>
              <th className="px-3 py-3">Laatste login</th>
              <th className="px-3 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  Geen users in dit filter.
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--bg-deep)] text-xs font-bold">
                      {u.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {u.name}
                      </div>
                      <button
                        onClick={() => copyEmail(u.email)}
                        className="group inline-flex items-center gap-1 truncate text-[0.6875rem] text-muted-foreground hover:text-[color:var(--navy)]"
                        title="Klik om te kopiëren"
                      >
                        {u.email}
                        <Copy className="size-3 opacity-0 group-hover:opacity-100" />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.role === "admin" && (
                      <Badge color="purple" icon={Shield}>
                        Admin
                      </Badge>
                    )}
                    {u.role === "account_manager" && (
                      <Badge color="orange" icon={UserCog}>
                        Account Manager
                      </Badge>
                    )}
                    {u.banned && (
                      <Badge color="red" icon={Ban}>
                        Banned
                      </Badge>
                    )}
                    {!u.emailVerified && (
                      <Badge color="orange">Niet geverifieerd</Badge>
                    )}
                    {u.emailVerified && !u.banned && (
                      <Badge color="green" icon={Check}>
                        OK
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {u.organizations.length === 0 ? (
                    <span className="text-[color:var(--text-soft)]">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.organizations.slice(0, 2).map((o) => (
                        <Link
                          key={o.id}
                          href="/account/organization"
                          className="inline-flex items-center gap-1 rounded-full bg-[color:var(--bg-deep)] px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[color:var(--navy)] hover:bg-[color:var(--bg)]"
                          title={`${o.name} · ${o.role}`}
                        >
                          <Building2
                            className="size-3"
                            strokeWidth={2.2}
                          />
                          {o.name.slice(0, 18)}
                        </Link>
                      ))}
                      {u.organizations.length > 2 && (
                        <span className="text-[0.6875rem] text-[color:var(--text-soft)]">
                          +{u.organizations.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 font-mono text-xs">
                  {u.paidLicenseCount}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-3 py-3 text-xs">
                  {u.lastSessionAt ? (
                    <span title={new Date(u.lastSessionAt).toLocaleString("nl-NL")}>
                      {daysSince(u.lastSessionAt)}
                    </span>
                  ) : (
                    <span className="text-[color:var(--text-soft)]">nooit</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/admin/crm/${u.id}`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-[color:var(--navy)]"
                      title="Open CRM-profiel"
                    >
                      <Users className="size-4" strokeWidth={1.8} />
                    </Link>
                    <ActionMenuTrigger
                      user={u}
                      open={openMenuId === u.id}
                      busy={busy}
                      onToggle={() =>
                        setOpenMenuId(openMenuId === u.id ? null : u.id)
                      }
                      onClose={() => setOpenMenuId(null)}
                      onAction={performAction}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border bg-white p-3 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function ActionMenuTrigger({
  user,
  open,
  busy,
  onToggle,
  onClose,
  onAction,
}: {
  user: User;
  open: boolean;
  busy: string | null;
  onToggle: () => void;
  onClose: () => void;
  onAction: (
    userId: string,
    action: string,
    extra?: Record<string, unknown>,
    confirm?: string,
    success?: string,
  ) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    align: "left" | "right";
  } | null>(null);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const MENU_WIDTH = 256;
    const VIEWPORT_PAD = 8;
    const wantLeft = rect.right - MENU_WIDTH;
    const align = wantLeft < VIEWPORT_PAD ? "left" : "right";
    setPos({
      top: rect.bottom + 6,
      left:
        align === "right"
          ? Math.min(
              rect.right - MENU_WIDTH,
              window.innerWidth - MENU_WIDTH - VIEWPORT_PAD,
            )
          : Math.max(rect.left, VIEWPORT_PAD),
      align,
    });
    function onScroll() {
      onClose();
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, onClose]);

  function actionBusy(action: string) {
    return busy === `${user.id}:${action}`;
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={onToggle}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-[color:var(--navy)]"
        title="Acties"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="size-4" strokeWidth={1.8} />
      </button>
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={onClose} />
            <div
              role="menu"
              className="fixed z-[70] w-64 rounded-xl border bg-white p-1 shadow-2xl"
              style={{ top: pos.top, left: pos.left }}
            >
        <MenuItem
          icon={KeyRound}
          label="Stuur password-reset link"
          disabled={actionBusy("password-reset")}
          onClick={() =>
            onAction(
              user.id,
              "password-reset",
              undefined,
              `Reset-link sturen naar ${user.email}?`,
              `Reset-mail verstuurd naar ${user.email}.`,
            )
          }
        />
        <MenuItem
          icon={Lock}
          label="Zet nieuw wachtwoord (direct)"
          onClick={() => {
            const pw = window.prompt(
              `Nieuw wachtwoord voor ${user.email}\n\nMin. 8 tekens. Actieve sessies worden uitgelogd.`,
            );
            if (!pw) return;
            if (pw.length < 8) {
              alert("Wachtwoord moet minimaal 8 tekens lang zijn.");
              return;
            }
            onAction(
              user.id,
              "set-password",
              { newPassword: pw },
              undefined,
              `Wachtwoord gezet voor ${user.email}. Sessies geforceerd uitgelogd.`,
            );
          }}
        />
        <div className="my-1 h-px bg-muted" />
        <MenuItem
          icon={InfinityIcon}
          label="Geef lifetime access"
          onClick={() => {
            const type =
              window.prompt(
                `Lifetime license voor ${user.email}\n\nType: "consumer" of "team" (default: consumer)`,
                "consumer",
              ) ?? "consumer";
            const t = type === "team" ? "team" : "consumer";
            onAction(
              user.id,
              "grant-lifetime",
              { licenseType: t },
              `Lifetime ${t}-license aan ${user.email} geven? (Geen einddatum, geen Mollie-koppeling)`,
              `Lifetime license uitgegeven.`,
            );
          }}
        />
        <MenuItem
          icon={Gift}
          label="Geef X maanden gratis"
          onClick={() => {
            const monthsStr = window.prompt(
              `Aantal maanden gratis voor ${user.email}:`,
              "3",
            );
            if (!monthsStr) return;
            const months = Number(monthsStr);
            if (!Number.isFinite(months) || months < 1) {
              alert("Geef een positief aantal maanden.");
              return;
            }
            onAction(
              user.id,
              "grant-months",
              { months },
              undefined,
              `${months} maanden gratis uitgegeven aan ${user.email}.`,
            );
          }}
        />
        <div className="my-1 h-px bg-muted" />
        {!user.emailVerified && (
          <MenuItem
            icon={UserCheck}
            label="Markeer email als geverifieerd"
            onClick={() =>
              onAction(
                user.id,
                "verify-email",
                undefined,
                undefined,
                "Email geverifieerd.",
              )
            }
          />
        )}
        <MenuItem
          icon={LogOut}
          label="Force-logout (alle sessies)"
          onClick={() =>
            onAction(
              user.id,
              "force-logout",
              undefined,
              `Alle actieve sessies van ${user.email} beëindigen?`,
              "Alle sessies beëindigd.",
            )
          }
        />
        <MenuItem
          icon={UserCog}
          label="Login als deze user (impersonate)"
          onClick={() =>
            onAction(
              user.id,
              "impersonate",
              undefined,
              `Inloggen als ${user.email}? Je sessie wordt vervangen tot je uitlogt.`,
              "Bezig met inloggen…",
            )
          }
        />
        <div className="my-1 h-px bg-muted" />
        {user.role !== "user" && (
          <MenuItem
            icon={Shield}
            label="Maak gewone user"
            onClick={() =>
              onAction(
                user.id,
                "set-role",
                { role: "user" },
                `Rechten afnemen van ${user.email}?`,
                "Rol bijgewerkt naar 'user'.",
              )
            }
          />
        )}
        {user.role !== "account_manager" && (
          <MenuItem
            icon={UserCog}
            label="Maak Account Manager"
            onClick={() =>
              onAction(
                user.id,
                "set-role",
                { role: "account_manager" },
                `${user.email} account-manager-rechten geven?`,
                "Rol bijgewerkt naar 'account_manager'.",
              )
            }
          />
        )}
        {user.role !== "admin" && (
          <MenuItem
            icon={Shield}
            label="Maak admin"
            onClick={() =>
              onAction(
                user.id,
                "set-role",
                { role: "admin" },
                `${user.email} VOLLEDIGE admin-rechten geven?`,
                "Rol bijgewerkt naar 'admin'.",
              )
            }
          />
        )}
        {user.banned ? (
          <MenuItem
            icon={UserCheck}
            label="Unban"
            onClick={() =>
              onAction(
                user.id,
                "unban",
                undefined,
                undefined,
                "User unbanned.",
              )
            }
          />
        ) : (
          <MenuItem
            icon={Ban}
            label="Ban user"
            danger
            onClick={() => {
              const reason = window.prompt("Reden voor ban (optioneel):");
              if (reason === null) return;
              onAction(
                user.id,
                "ban",
                { banReason: reason || undefined },
                undefined,
                "User banned.",
              );
            }}
          />
        )}
        <div className="my-1 h-px bg-muted" />
        <MenuItem
          icon={Trash2}
          label="Verwijder user (permanent)"
          danger
          onClick={() =>
            onAction(
              user.id,
              "delete",
              undefined,
              `PERMANENT VERWIJDEREN: ${user.email}\n\nAlle gegevens worden gewist (auth + customer-attributes). Licenses/orders blijven met user_id=null.\n\nDoorgaan?`,
              "User verwijderd.",
            )
          }
        />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: typeof Ban;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium disabled:opacity-50 ${
        danger
          ? "text-red-700 hover:bg-red-50"
          : "text-[color:var(--text)] hover:bg-muted"
      }`}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
    </button>
  );
}

function Badge({
  color,
  icon: Icon,
  children,
}: {
  color: "purple" | "red" | "orange" | "green";
  icon?: typeof Ban;
  children: React.ReactNode;
}) {
  const cls = {
    purple: "bg-purple-100 text-purple-800",
    red: "bg-red-100 text-red-800",
    orange: "bg-orange-100 text-orange-800",
    green: "bg-green-100 text-green-800",
  }[color];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold ${cls}`}
    >
      {Icon && <Icon className="size-3" strokeWidth={2.4} />}
      {children}
    </span>
  );
}
