// Dicteren.ai — GET /api/me/permissions
//
// Geeft de huidige user z'n rechten + identiteit terug. AM-assistenten
// gebruiken dit als eerste boot-call om hun scope en action-flags op te
// halen. Deterministisch: één bron, één antwoord.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { getPermissionsFor } from "@/lib/services/staffActionPermissions";
import { getBlockedPathsForUser } from "@/lib/services/staffPermissions";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }

  const [userRow] = await db
    .select({
      name: authUsers.name,
      assistantName: authUsers.assistantName,
    })
    .from(authUsers)
    .where(eq(authUsers.id, session.user.id))
    .limit(1);

  const [actions, blockedPages] = await Promise.all([
    getPermissionsFor({
      userId: session.user.id,
      role: session.user.role ?? null,
    }),
    getBlockedPathsForUser(session.user.id),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      humanName: userRow?.name ?? session.user.name ?? null,
      assistantName: userRow?.assistantName ?? null,
      blockedPages,
      actions,
      dataScope:
        session.user.role === "admin"
          ? null
          : {
              filterColumn: "account_owner_id",
              value: session.user.id,
            },
      version: new Date().toISOString(),
    },
  });
}
