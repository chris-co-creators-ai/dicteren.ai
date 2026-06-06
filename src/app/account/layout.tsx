import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)" }}
    >
      <header className="border-b border-[color:var(--border-soft)] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-sm font-bold tracking-tight">
            Dicteren<span style={{ color: "var(--orange)" }}>.ai</span>
          </Link>
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/account/licenses"
              className="text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
            >
              Licenties
            </Link>
            <Link
              href="/account/organization"
              className="text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
            >
              Organisatie
            </Link>
            <Link
              href="/account/billing"
              className="text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
            >
              Facturering
            </Link>
            <Link
              href="/account/hulp"
              className="text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
            >
              Hulp
            </Link>
            <span
              className="hidden text-[color:var(--text-soft)] sm:inline"
              title={`Ingelogd als ${session.user.email}`}
            >
              {session.user.email}
            </span>
            <Link
              href="/auth/sign-out"
              className="text-[color:var(--text-muted)] hover:text-[color:var(--navy)]"
            >
              Uitloggen
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
