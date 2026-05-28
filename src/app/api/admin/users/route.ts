// Dicteren.ai — Admin-only: nieuwe staff-user toevoegen.
// Maakt user via Better Auth admin-plugin, optioneel met lifetime-grant,
// en stuurt welkomstmail met set-password-link.

import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { requireStaffApi } from "@/lib/auth/session";
import { dbAuth } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";
import { grantLifetimeLicense } from "@/lib/services/adminGrant";
import { sendStaffWelcomeEmail } from "@/lib/services/email";
import { validateAndNormalizeEmail } from "@/lib/services/emailNormalize";
import { logEvent } from "@/lib/services/audit";

export async function POST(request: Request) {
  const guard = await requireStaffApi({ adminOnly: true });
  if ("response" in guard) return guard.response;
  const session = guard.session;

  let body: {
    name?: string;
    email?: string;
    role?: "user" | "admin" | "account_manager";
    grantLifetime?: boolean;
    sendWelcomeEmail?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body ontbreekt" },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  const rawEmail = body.email?.trim() ?? "";
  const role = body.role ?? "user";
  if (!name || !rawEmail) {
    return NextResponse.json(
      { success: false, error: "Naam en email verplicht." },
      { status: 400 },
    );
  }
  const normalized = validateAndNormalizeEmail(rawEmail);
  if (!normalized.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          normalized.reason === "disposable"
            ? "Dit lijkt een wegwerp-emailadres. Gebruik een echte werk-email."
            : "Ongeldig emailadres.",
      },
      { status: 400 },
    );
  }
  const email = normalized.raw;
  if (!["user", "admin", "account_manager"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Onbekende rol." },
      { status: 400 },
    );
  }

  // Hard duplicate-check op normalized-variant (vangt Gmail-dots + plus-aliassen).
  const [existing] = await dbAuth
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.emailNormalized, normalized.normalized))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: "Deze email is al in gebruik. Gebruik /admin/users om rol aan te passen.",
      },
      { status: 409 },
    );
  }

  // Genereer random temp-password (32 hex chars). Wordt nooit gebruikt —
  // we sturen direct request-password-reset zodat ze hun eigen wachtwoord
  // instellen via de Resend-mail.
  const tempPassword = randomBytes(16).toString("hex");
  const requestHeaders = await nextHeaders();

  try {
    await auth.api.createUser({
      headers: requestHeaders,
      body: {
        email,
        password: tempPassword,
        name,
        // Better Auth admin-plugin createUser ondersteunt alleen built-in
        // roles. Account_manager updaten we direct in DB hieronder.
        role: role === "account_manager" ? "user" : (role as "user" | "admin"),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Aanmaken mislukt";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }

  // Lookup created user-id.
  const [created] = await dbAuth
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);
  if (!created) {
    return NextResponse.json(
      { success: false, error: "User aangemaakt maar lookup mislukt." },
      { status: 500 },
    );
  }
  const userId = created.id;

  // Account_manager: override role via directe DB-update.
  if (role === "account_manager") {
    await dbAuth
      .update(authUser)
      .set({ role: "account_manager", updatedAt: new Date() })
      .where(eq(authUser.id, userId));
  }

  // Markeer als geverifieerd (admin-toevoegd = vertrouwd).
  await dbAuth
    .update(authUser)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(authUser.id, userId));

  // Optioneel lifetime grant.
  let grantedLicense: string | null = null;
  if (body.grantLifetime) {
    const grant = await grantLifetimeLicense({
      userId,
      type: "consumer",
      grantedByUserId: session.user.id,
      notes: `Lifetime auto-granted bij staff-onboarding door ${session.user.email}`,
    });
    grantedLicense = grant.code;
  }

  // Welkomstmail met set-password-link via Better Auth reset-flow.
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://www.dicteren.ai";
  let mailSent = false;
  if (body.sendWelcomeEmail !== false) {
    // Trigger Better Auth's password-reset zodat klant een geldig
    // reset-token krijgt. De Resend-callback in lib/auth/server.ts
    // verstuurt standaard de reset-mail; in plaats daarvan sturen we
    // hier onze eigen welkomstmail met dezelfde reset-URL.
    //
    // Pragmatisch: stuur welkomstmail met /auth/forgot-password URL —
    // gebruiker vraagt daar zelf nieuwe reset-link aan. Geen token-
    // generatie nodig (security: token uit admin-create email zou een
    // staff-account compromiseren als email leakt).
    const setPasswordUrl = `${appBase}/auth/forgot-password?email=${encodeURIComponent(email)}`;
    const adminUrl = `${appBase}/admin`;
    const result = await sendStaffWelcomeEmail({
      to: email,
      name,
      role: role === "user" ? "account_manager" : role, // user-role krijgt geen staff-mail (zou niet voorkomen)
      setPasswordUrl,
      adminUrl,
      hasLifetime: Boolean(body.grantLifetime),
      inviterName: session.user.name,
      userId,
    });
    mailSent = result.success;
  }

  await logEvent({
    action: "admin.action",
    entityType: "user",
    entityId: userId,
    actorId: session.user.id,
    metadata: {
      kind: "staff_user_created",
      email,
      role,
      grantedLifetime: Boolean(body.grantLifetime),
      grantedLicense,
      mailSent,
    },
  });

  return NextResponse.json({
    success: true,
    userId,
    email,
    role,
    grantedLicense,
    mailSent,
  });
}
