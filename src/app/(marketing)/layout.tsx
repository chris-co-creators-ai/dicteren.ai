import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Role-check moet server-side: client-side useSession() bevat geen role
  // veld. Door initialUser (incl. role) als prop te passen zien admin-users
  // de juiste header-knop ("Admin" → /admin) direct bij eerste render.
  const session = await getSession();
  const initialUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role ?? null,
      }
    : null;

  return (
    <>
      <SiteHeader initialUser={initialUser} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
