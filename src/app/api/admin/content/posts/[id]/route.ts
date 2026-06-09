import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  getPost,
  updatePost,
  deletePost,
  withDownloadUrls,
} from "@/lib/services/content";

type Params = Promise<{ id: string }>;

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

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    return NextResponse.json({ success: false, error: "Niet gevonden" }, { status: 404 });
  }
  const assets = await withDownloadUrls(post.assets);
  return NextResponse.json({ success: true, post: { ...post, assets } });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch: Parameters<typeof updatePost>[1] = {};
  if (body.channel !== undefined) {
    if (!CHANNELS.includes(body.channel)) {
      return NextResponse.json({ success: false, error: "Ongeldig channel" }, { status: 400 });
    }
    patch.channel = body.channel;
  }
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.body !== undefined) patch.body = body.body ?? null;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ success: false, error: "Ongeldige status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.scheduledAt !== undefined) {
    patch.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (patch.scheduledAt && Number.isNaN(patch.scheduledAt.getTime())) {
      return NextResponse.json({ success: false, error: "Ongeldige scheduledAt" }, { status: 400 });
    }
  }
  if (body.assigneeUserId !== undefined) patch.assigneeUserId = body.assigneeUserId || null;
  if (body.assetIds !== undefined) {
    patch.assetIds = Array.isArray(body.assetIds) ? body.assetIds : [];
  }

  const post = await updatePost(id, patch, guard.session.user.id);
  if (!post) {
    return NextResponse.json({ success: false, error: "Niet gevonden" }, { status: 404 });
  }
  return NextResponse.json({ success: true, post });
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  await deletePost(id, guard.session.user.id);
  return NextResponse.json({ success: true });
}
