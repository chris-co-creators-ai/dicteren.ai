import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./server";

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role?: string | null;
    emailVerified?: boolean;
    image?: string | null;
  };
  session: {
    id: string;
    expiresAt: Date | string;
    token: string;
  };
};

/**
 * Read the current session from cookies. Returns null if no valid session.
 * Safe to call in server components, server actions, and route handlers.
 *
 * Server components that call this must export `dynamic = 'force-dynamic'`.
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });
    if (!result?.user) return null;
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name ?? "",
        role: (result.user as { role?: string | null }).role ?? null,
        emailVerified: result.user.emailVerified ?? false,
        image: result.user.image ?? null,
      },
      session: {
        id: result.session.id,
        expiresAt: result.session.expiresAt,
        token: result.session.token,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Require any authenticated session. Redirects to sign-in if missing.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  return session;
}

/**
 * Require an admin session. Non-admin users are sent to the homepage
 * with an `admin_only` error flag.
 */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (session.user.role !== "admin") redirect("/?error=admin_only");
  return session;
}

/**
 * Toelating voor admin-staff: zowel "admin" als "account_manager". Voor
 * /admin/* pages waar account-managers operationeel mogen werken (CRM,
 * berichten, affiliates, etc.).
 */
export async function requireAdminOrManager(): Promise<AuthSession> {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  const role = session.user.role;
  if (role !== "admin" && role !== "account_manager") {
    redirect("/?error=admin_only");
  }
  return session;
}

/**
 * Voor admin-only sub-pages binnen /admin/* (Users, Licenties, Organisaties,
 * Orders, Facturen, E-mails, Support, Settings). Account-managers worden
 * teruggestuurd naar /admin (overzicht) ipv homepage.
 */
export async function assertAdminOnly(): Promise<AuthSession> {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (session.user.role !== "admin") redirect("/admin");
  return session;
}

/** Voor publieke role-checks zonder redirect (in service-laag). */
export function isAdminOrManager(role: string | null | undefined): boolean {
  return role === "admin" || role === "account_manager";
}

/** Helper for JSON API routes: 401 if no session, 403 if not admin. */
export async function adminOnlyJson<T>(
  handler: (session: AuthSession) => Promise<T> | T,
): Promise<Response> {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "admin_only" }, { status: 403 });
  }
  const result = await handler(session);
  return Response.json(result);
}
