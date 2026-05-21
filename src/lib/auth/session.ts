import "server-only";
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
    expiresAt: string;
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
    const result = await auth.getSession();
    return (result?.data ?? null) as AuthSession | null;
  } catch {
    return null;
  }
}

/**
 * Require any authenticated session. Redirects to sign-in if missing.
 * Use in server components/actions for routes that should not be public
 * but don't need an admin role.
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  return session;
}

/**
 * Require an admin session. Non-admin users are sent to the homepage
 * with an `admin_only` error flag. Use in server components/actions
 * and admin-only API routes.
 */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (session.user.role !== "admin") redirect("/?error=admin_only");
  return session;
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
