// Dicteren.ai — Self-service: koppel een eigen apparaat los van je licentie.
// Ownership-scope zit in deactivateOwnActivation (alleen activaties op een
// licentie van de ingelogde user). Het vrijgekomen slot is direct herbruikbaar.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deactivateOwnActivation } from "@/lib/services/account";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Inloggen vereist" },
      { status: 401 },
    );
  }
  const { id } = await params;
  const result = await deactivateOwnActivation({
    userId: session.user.id,
    activationId: id,
  });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 403 },
    );
  }
  return NextResponse.json({ success: true });
}
