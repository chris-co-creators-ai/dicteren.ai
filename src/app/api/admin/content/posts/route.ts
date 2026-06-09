import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { createPost } from "@/lib/services/content";

const CHANNELS = [
  "linkedin",
  "instagram",
  "tiktok",
  "snapchat",
  "youtube",
  "email_flow",
  "blog_article",
] as const;
const STATUSES = ["idea", "draft", "scheduled", "published", "cancelled"] as const;

export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const body = await request.json().catch(() => ({}));

  const spaceId = (body.spaceId as string | undefined)?.trim();
  const channel = body.channel as (typeof CHANNELS)[number];
  const title = (body.title as string | undefined)?.trim();
  if (!spaceId || !title) {
    return NextResponse.json(
      { success: false, error: "spaceId en title zijn verplicht" },
      { status: 400 },
    );
  }
  if (!CHANNELS.includes(channel)) {
    return NextResponse.json(
      { success: false, error: "Ongeldig channel" },
      { status: 400 },
    );
  }
  const status = STATUSES.includes(body.status) ? body.status : "idea";
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json(
      { success: false, error: "Ongeldige scheduledAt" },
      { status: 400 },
    );
  }

  const post = await createPost({
    spaceId,
    channel,
    title,
    body: (body.body as string | undefined) ?? null,
    status,
    scheduledAt,
    assigneeUserId: (body.assigneeUserId as string | undefined) || null,
    assetIds: Array.isArray(body.assetIds) ? body.assetIds : [],
    createdByUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, post });
}
