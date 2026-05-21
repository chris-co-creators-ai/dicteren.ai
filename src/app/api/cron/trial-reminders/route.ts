// Dicteren.ai — Trial-reminder cron
//
// Runs daily (Vercel Cron, see vercel.json). Scans active trial licenses
// and fires the d7 mid-reminder, d13 final-reminder, or d14 expired mail
// depending on remaining time. Idempotency via email_logs.idempotency_key.
//
// Auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}`. We reject any
// caller without the right secret. Set CRON_SECRET in Vercel env.

import { NextResponse } from "next/server";
import { and, eq, gte, isNotNull, like, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  authUsers,
  emailLogs,
  licenses,
  type License,
} from "@/lib/db/schema";
import {
  sendTrialExpiredEmail,
  sendTrialReminderD13Email,
  sendTrialReminderD7Email,
} from "@/lib/services";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Bucket = "d7" | "d13" | "expired";

type LicenseWithUser = License & {
  userEmail: string | null;
  userName: string | null;
};

async function alreadySent(
  idempotencyKey: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: emailLogs.id })
    .from(emailLogs)
    .where(eq(emailLogs.idempotencyKey, idempotencyKey))
    .limit(1);
  return Boolean(row);
}

async function findTrialsInWindow(
  expiresFrom: Date,
  expiresTo: Date,
): Promise<LicenseWithUser[]> {
  const rows = await db
    .select({
      license: licenses,
      userEmail: authUsers.email,
      userName: authUsers.name,
    })
    .from(licenses)
    .leftJoin(authUsers, eq(authUsers.id, licenses.userId))
    .where(
      and(
        like(licenses.code, "DIC-TRIAL-%"),
        eq(licenses.status, "active"),
        isNotNull(licenses.expiresAt),
        gte(licenses.expiresAt, expiresFrom),
        lte(licenses.expiresAt, expiresTo),
      ),
    );
  return rows.map((r) => ({
    ...r.license,
    userEmail: r.userEmail,
    userName: r.userName,
  }));
}

async function findExpiredActiveTrials(now: Date): Promise<LicenseWithUser[]> {
  const rows = await db
    .select({
      license: licenses,
      userEmail: authUsers.email,
      userName: authUsers.name,
    })
    .from(licenses)
    .leftJoin(authUsers, eq(authUsers.id, licenses.userId))
    .where(
      and(
        like(licenses.code, "DIC-TRIAL-%"),
        eq(licenses.status, "active"),
        isNotNull(licenses.expiresAt),
        lte(licenses.expiresAt, now),
      ),
    );
  return rows.map((r) => ({
    ...r.license,
    userEmail: r.userEmail,
    userName: r.userName,
  }));
}

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const counts = { d7: 0, d13: 0, expired: 0, skipped: 0 };

  // D7 window: trials whose expiresAt is between today+6d and today+8d
  // (catches anything seen within a ±1d slack of the day-7 reminder)
  const d7From = new Date(now.getTime() + 6 * DAY);
  const d7To = new Date(now.getTime() + 8 * DAY);
  const d7Trials = await findTrialsInWindow(d7From, d7To);

  // D13 window: between now+12h and now+36h
  const d13From = new Date(now.getTime() + 12 * HOUR);
  const d13To = new Date(now.getTime() + 36 * HOUR);
  const d13Trials = await findTrialsInWindow(d13From, d13To);

  // Expired: any active trial whose expiresAt is in the past
  const expiredTrials = await findExpiredActiveTrials(now);

  await sendBucket(d7Trials, "d7", counts);
  await sendBucket(d13Trials, "d13", counts);
  await sendBucket(expiredTrials, "expired", counts);

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    counts,
  });
}

async function sendBucket(
  trials: LicenseWithUser[],
  bucket: Bucket,
  counts: { d7: number; d13: number; expired: number; skipped: number },
) {
  for (const lic of trials) {
    if (!lic.userEmail) {
      counts.skipped++;
      continue;
    }

    const key =
      bucket === "d7"
        ? `trial-reminder-d7/${lic.id}`
        : bucket === "d13"
          ? `trial-reminder-d13/${lic.id}`
          : `trial-expired/${lic.id}`;

    if (await alreadySent(key)) {
      counts.skipped++;
      continue;
    }

    if (bucket === "d7") {
      const daysLeft = lic.expiresAt
        ? Math.max(1, Math.ceil((lic.expiresAt.getTime() - Date.now()) / DAY))
        : 7;
      const mail = await sendTrialReminderD7Email({
        to: lic.userEmail,
        name: lic.userName ?? undefined,
        daysLeft,
        expiresAt: lic.expiresAt!,
        userId: lic.userId ?? undefined,
        licenseId: lic.id,
      });
      if (mail.success) counts.d7++;
      continue;
    }

    if (bucket === "d13") {
      const mail = await sendTrialReminderD13Email({
        to: lic.userEmail,
        name: lic.userName ?? undefined,
        expiresAt: lic.expiresAt!,
        userId: lic.userId ?? undefined,
        licenseId: lic.id,
      });
      if (mail.success) counts.d13++;
      continue;
    }

    // expired: also flip license.status so /api/license/status reflects it
    await db
      .update(licenses)
      .set({
        status: "expired",
        updatedAt: new Date(),
      })
      .where(and(eq(licenses.id, lic.id), eq(licenses.status, "active")));

    const mail = await sendTrialExpiredEmail({
      to: lic.userEmail,
      name: lic.userName ?? undefined,
      userId: lic.userId ?? undefined,
      licenseId: lic.id,
    });
    if (mail.success) counts.expired++;
  }
}

