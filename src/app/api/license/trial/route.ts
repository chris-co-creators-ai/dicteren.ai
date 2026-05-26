// Dicteren.ai — Trial claim (web-initiated)
//
// Logged-in user requests a 14-day trial. Server creates the license,
// mails the code, returns it. Anti-abuse: 1 trial per userId, permanent.
// Device-fingerprint anti-abuse happens at /api/license/activate time
// (trialAlreadyUsedOnDevice).
//
// Returned shape mirrors POST /trial/start server-action so the route
// can be reused by any future client (CLI, automated provisioning, etc.).

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  claimTrialForUser,
  enforceRateLimit,
  sendTrialStartedEmail,
  logEvent,
  trackEvent,
} from "@/lib/services";

type TrialResponse =
  | {
      success: true;
      license: {
        id: string;
        code: string;
        expiresAt: string;
        type: "beta";
      };
      isExisting: boolean;
    }
  | { success: false; error: string; code: string };

export async function POST(request: Request): Promise<NextResponse<TrialResponse>> {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json<TrialResponse>(
      { success: false, error: "Inloggen vereist.", code: "unauthenticated" },
      { status: 401 },
    );
  }

  // Anti-spam: 3 claim-pogingen per dag per IP. Dedupe op userId zit al
  // in claimTrialForUser, dit beschermt tegen mass-account-creation om
  // trial-codes te oogsten.
  const blocked = await enforceRateLimit(request, "license:trial");
  if (blocked) return blocked as NextResponse<TrialResponse>;

  const result = await claimTrialForUser({ userId: session.user.id });
  if (!result.success) {
    return NextResponse.json<TrialResponse>(
      { success: false, error: result.error, code: result.code },
      { status: result.code === "trial_already_used" ? 403 : 400 },
    );
  }

  const { license, isExisting } = result;

  // Only mail on FIRST claim. Reactivation returns the existing code without
  // spamming the user with the welcome again.
  if (!isExisting && license.expiresAt) {
    const mail = await sendTrialStartedEmail({
      to: session.user.email,
      name: session.user.name,
      licenseCode: license.code,
      expiresAt: license.expiresAt,
      userId: session.user.id,
      licenseId: license.id,
    });
    if (!mail.success) {
      console.warn("[trial] start mail failed", mail.error, mail.code);
    }
    await logEvent({
      action: "license.created",
      entityType: "license",
      entityId: license.id,
      actorId: session.user.id,
      metadata: { kind: "trial", expiresAt: license.expiresAt.toISOString() },
    });
    await trackEvent("trial_claimed", { isExisting: false });
  }

  return NextResponse.json<TrialResponse>({
    success: true,
    license: {
      id: license.id,
      code: license.code,
      expiresAt: license.expiresAt!.toISOString(),
      type: "beta",
    },
    isExisting,
  });
}
