// Dicteren.ai — Admin user-management endpoints.
// POST /api/admin/users/[id] met body { action: "..." } → één endpoint, meer-
// dere acties via Better Auth admin-plugin. Maakt frontend-code simpeler.
// DELETE /api/admin/users/[id] → harde verwijdering.

import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { eq } from "drizzle-orm";
import { dbAuth } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";
import { auth } from "@/lib/auth/server";
import { requireStaffApi } from "@/lib/auth/session";
import { sendPasswordResetEmail } from "@/lib/services/email";
import { logEvent } from "@/lib/services/audit";

type Action =
  | "password-reset"
  | "ban"
  | "unban"
  | "verify-email"
  | "force-logout"
  | "set-role"
  | "impersonate";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const session = guard.session;

  const { id: userId } = await params;

  let body: {
    action?: Action;
    banReason?: string;
    banExpiresIn?: number;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  if (!body.action) {
    return NextResponse.json(
      { success: false, error: "action verplicht" },
      { status: 400 },
    );
  }

  const requestHeaders = await nextHeaders();

  // Lookup user voor context-logging + email-actie.
  const [user] = await dbAuth
    .select({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
    })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User niet gevonden" },
      { status: 404 },
    );
  }

  try {
    switch (body.action) {
      case "password-reset": {
        // Genereer een reset-token via Better Auth en stuur mail via onze
        // Resend-callback (zelfde flow als user-initiated forgot-password).
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/reset-password`;
        await auth.api.requestPasswordReset({
          body: { email: user.email, redirectTo: resetUrl },
        });
        await logEvent({
          action: "admin.action",
          entityType: "user",
          entityId: userId,
          actorId: session.user.id,
          metadata: { kind: "password_reset_triggered", email: user.email },
        });
        return NextResponse.json({ success: true });
      }

      case "ban": {
        await auth.api.banUser({
          headers: requestHeaders,
          body: {
            userId,
            banReason: body.banReason ?? "Geen reden opgegeven",
            banExpiresIn: body.banExpiresIn, // seconds; undefined = permanent
          },
        });
        await logEvent({
          action: "admin.action",
          entityType: "user",
          entityId: userId,
          actorId: session.user.id,
          metadata: { kind: "user_banned", reason: body.banReason ?? null },
        });
        return NextResponse.json({ success: true });
      }

      case "unban": {
        await auth.api.unbanUser({
          headers: requestHeaders,
          body: { userId },
        });
        await logEvent({
          action: "admin.action",
          entityType: "user",
          entityId: userId,
          actorId: session.user.id,
          metadata: { kind: "user_unbanned" },
        });
        return NextResponse.json({ success: true });
      }

      case "verify-email": {
        await dbAuth
          .update(authUser)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(eq(authUser.id, userId));
        await logEvent({
          action: "admin.action",
          entityType: "user",
          entityId: userId,
          actorId: session.user.id,
          metadata: { kind: "email_verified_by_admin" },
        });
        return NextResponse.json({ success: true });
      }

      case "force-logout": {
        await auth.api.revokeUserSessions({
          headers: requestHeaders,
          body: { userId },
        });
        await logEvent({
          action: "admin.action",
          entityType: "user",
          entityId: userId,
          actorId: session.user.id,
          metadata: { kind: "sessions_revoked" },
        });
        return NextResponse.json({ success: true });
      }

      case "set-role": {
        if (!body.role) {
          return NextResponse.json(
            { success: false, error: "role verplicht" },
            { status: 400 },
          );
        }
        if (!["user", "admin", "account_manager"].includes(body.role)) {
          return NextResponse.json(
            {
              success: false,
              error: "role moet user / admin / account_manager zijn",
            },
            { status: 400 },
          );
        }
        // Direct DB-update ipv auth.api.setRole — die accepteert alleen
        // de built-in "user" | "admin" types. Account_manager is een
        // extra rol bovenop het schema (text-veld, geen enum).
        await dbAuth
          .update(authUser)
          .set({ role: body.role, updatedAt: new Date() })
          .where(eq(authUser.id, userId));
        await logEvent({
          action: "admin.action",
          entityType: "user",
          entityId: userId,
          actorId: session.user.id,
          metadata: { kind: "role_changed", role: body.role },
        });
        return NextResponse.json({ success: true });
      }

      case "impersonate": {
        // Genereert een session-cookie voor de target-user. Vereist dat we
        // de Set-Cookie van auth.api.impersonateUser door-zenden.
        const result = await auth.api.impersonateUser({
          headers: requestHeaders,
          body: { userId },
          returnHeaders: true,
        });
        const response = NextResponse.json({
          success: true,
          redirectTo: "/account/licenses",
        });
        const setCookie = result.headers?.get("set-cookie");
        if (setCookie) {
          response.headers.append("set-cookie", setCookie);
        }
        await logEvent({
          action: "admin.action",
          entityType: "user",
          entityId: userId,
          actorId: session.user.id,
          metadata: { kind: "impersonated", targetEmail: user.email },
        });
        return response;
      }

      default:
        return NextResponse.json(
          { success: false, error: "Onbekende actie" },
          { status: 400 },
        );
    }
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Onbekende fout in admin-actie";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }

  // sendPasswordResetEmail wordt elders gebruikt door Better Auth callback,
  // niet hier — voorkom unused-import.
  void sendPasswordResetEmail;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const session = guard.session;
  const { id: userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json(
      { success: false, error: "Je kunt jezelf niet verwijderen." },
      { status: 400 },
    );
  }

  const requestHeaders = await nextHeaders();
  try {
    await auth.api.removeUser({
      headers: requestHeaders,
      body: { userId },
    });
    await logEvent({
      action: "admin.action",
      entityType: "user",
      entityId: userId,
      actorId: session.user.id,
      metadata: { kind: "user_deleted" },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verwijderen mislukt";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
