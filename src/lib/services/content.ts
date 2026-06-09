import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/schema/auth-bridge";
import { affiliates } from "@/lib/db/schema/affiliate";
import {
  contentSpaces,
  contentAssets,
  contentPosts,
  contentPostAssets,
  contentAssetRequests,
  type ContentSpace,
  type ContentAsset,
  type ContentPost,
} from "@/lib/db/schema/content";
import { logEvent } from "@/lib/services/audit";
import { createBoard, createTask, updateTask, toggleTaskDone, archiveTask } from "@/lib/services/kanban";
import { signDownload, deleteObject } from "@/lib/services/r2";

// ── Ruimtes (spaces) ────────────────────────────────────────────────────────
// Eén interne Dicteren-ruimte + één ruimte per affiliate. Idempotent geseed.

export async function ensureInternalSpace(): Promise<ContentSpace> {
  const [existing] = await db
    .select()
    .from(contentSpaces)
    .where(eq(contentSpaces.kind, "internal"))
    .limit(1);
  if (existing) return existing;
  const [space] = await db
    .insert(contentSpaces)
    .values({ kind: "internal", affiliateId: null, name: "Dicteren intern" })
    .returning();
  return space;
}

export async function ensureAffiliateSpace(
  affiliateId: string,
  name: string,
): Promise<ContentSpace> {
  const [existing] = await db
    .select()
    .from(contentSpaces)
    .where(eq(contentSpaces.affiliateId, affiliateId))
    .limit(1);
  if (existing) return existing;
  const [space] = await db
    .insert(contentSpaces)
    .values({ kind: "affiliate", affiliateId, name })
    .returning();
  return space;
}

export type SpaceListItem = ContentSpace & { affiliateName: string | null };

export async function listSpaces(): Promise<SpaceListItem[]> {
  // Zorg dat de interne ruimte + één ruimte per actieve affiliate bestaan.
  await ensureInternalSpace();
  const affs = await db
    .select({ id: affiliates.id, name: affiliates.name })
    .from(affiliates);
  for (const a of affs) {
    await ensureAffiliateSpace(a.id, a.name ?? "Affiliate");
  }
  const rows = await db
    .select({
      space: contentSpaces,
      affiliateName: affiliates.name,
    })
    .from(contentSpaces)
    .leftJoin(affiliates, eq(affiliates.id, contentSpaces.affiliateId))
    .orderBy(asc(contentSpaces.kind), asc(contentSpaces.name));
  return rows.map((r) => ({ ...r.space, affiliateName: r.affiliateName ?? null }));
}

// Zorgt dat de ruimte een geseed Content-bord heeft en geeft het board-id terug.
export async function ensureSpaceBoard(
  spaceId: string,
  actorId: string,
): Promise<string | null> {
  const [space] = await db
    .select()
    .from(contentSpaces)
    .where(eq(contentSpaces.id, spaceId))
    .limit(1);
  if (!space) return null;
  if (space.boardId) return space.boardId;
  const board = await createBoard({
    name: `Content — ${space.name}`,
    description: "Automatisch bord voor geplande content (kalender-sync).",
    visibility: "shared",
    color: "#f97316",
    ownerUserId: actorId,
  });
  await db
    .update(contentSpaces)
    .set({ boardId: board.id })
    .where(eq(contentSpaces.id, spaceId));
  return board.id;
}

// ── Assets (bibliotheek) ─────────────────────────────────────────────────────

export type AssetWithUrl = ContentAsset & {
  url: string | null;
  thumbnailUrl: string | null;
};

export async function listAssets(filter: {
  spaceId?: string;
  kind?: "image" | "video" | "document";
  includeArchived?: boolean;
}): Promise<ContentAsset[]> {
  const conds = [];
  if (filter.spaceId) conds.push(eq(contentAssets.spaceId, filter.spaceId));
  if (filter.kind) conds.push(eq(contentAssets.kind, filter.kind));
  if (!filter.includeArchived) conds.push(isNull(contentAssets.archivedAt));
  return db
    .select()
    .from(contentAssets)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(contentAssets.createdAt));
}

// Registreert de metadata ná een geslaagde presigned upload naar R2.
export async function createAsset(args: {
  spaceId: string;
  r2Key: string;
  kind: "image" | "video" | "document";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  thumbnailR2Key?: string | null;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  label?: string | null;
  tags?: string[] | null;
  uploadedByUserId?: string | null;
  uploadedByAffiliateId?: string | null;
}): Promise<ContentAsset> {
  const [asset] = await db
    .insert(contentAssets)
    .values({
      spaceId: args.spaceId,
      r2Key: args.r2Key,
      kind: args.kind,
      fileName: args.fileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      thumbnailR2Key: args.thumbnailR2Key ?? null,
      width: args.width ?? null,
      height: args.height ?? null,
      durationSec: args.durationSec ?? null,
      label: args.label ?? null,
      tags: args.tags ?? null,
      uploadedByUserId: args.uploadedByUserId ?? null,
      uploadedByAffiliateId: args.uploadedByAffiliateId ?? null,
    })
    .returning();
  await logEvent({
    action: "admin.action",
    entityType: "content_asset",
    entityId: asset.id,
    actorId: args.uploadedByUserId ?? null,
    metadata: { kind: "asset_created", spaceId: args.spaceId, fileName: asset.fileName },
  });
  return asset;
}

export async function getAsset(id: string): Promise<ContentAsset | null> {
  const [a] = await db.select().from(contentAssets).where(eq(contentAssets.id, id)).limit(1);
  return a ?? null;
}

// Voegt verse presigned GET-URL's toe (kort geldig). De UI roept dit aan om
// thumbnails/previews te tonen zonder de bucket publiek te maken.
export async function withDownloadUrls(assets: ContentAsset[]): Promise<AssetWithUrl[]> {
  return Promise.all(
    assets.map(async (a) => ({
      ...a,
      url: await signDownload(a.r2Key).catch(() => null),
      thumbnailUrl: a.thumbnailR2Key
        ? await signDownload(a.thumbnailR2Key).catch(() => null)
        : await signDownload(a.r2Key).catch(() => null),
    })),
  );
}

export async function archiveAsset(id: string, actorId: string): Promise<void> {
  await db
    .update(contentAssets)
    .set({ archivedAt: new Date() })
    .where(eq(contentAssets.id, id));
  await logEvent({
    action: "admin.action",
    entityType: "content_asset",
    entityId: id,
    actorId,
    metadata: { kind: "asset_archived" },
  });
}

// Verwijdert de asset én het R2-object (gebruik met zorg; archiveAsset is de
// zachte variant). Koppelingen vallen via cascade weg.
export async function deleteAsset(id: string, actorId: string): Promise<void> {
  const asset = await getAsset(id);
  if (!asset) return;
  await db.delete(contentAssets).where(eq(contentAssets.id, id));
  await deleteObject(asset.r2Key).catch((e) => console.warn("[content] R2 delete faalde", e));
  if (asset.thumbnailR2Key) {
    await deleteObject(asset.thumbnailR2Key).catch(() => {});
  }
  await logEvent({
    action: "admin.action",
    entityType: "content_asset",
    entityId: id,
    actorId,
    metadata: { kind: "asset_deleted" },
  });
}

// ── Posts (kalender) ─────────────────────────────────────────────────────────

const CHANNEL_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  youtube: "YouTube",
  email_flow: "E-mailflow",
  blog_article: "Blogartikel",
};

export type CalendarPost = ContentPost & {
  spaceName: string;
  assigneeName: string | null;
  thumbnailR2Key: string | null;
};

// Posts binnen een datumbereik voor de kalender-views, met de thumbnail van
// de eerste gekoppelde asset.
export async function listCalendar(filter: {
  from: Date;
  to: Date;
  spaceId?: string;
  channel?: ContentPost["channel"];
  assigneeUserId?: string;
}): Promise<CalendarPost[]> {
  const conds = [
    gte(contentPosts.scheduledAt, filter.from),
    lte(contentPosts.scheduledAt, filter.to),
  ];
  if (filter.spaceId) conds.push(eq(contentPosts.spaceId, filter.spaceId));
  if (filter.channel) conds.push(eq(contentPosts.channel, filter.channel));
  if (filter.assigneeUserId) conds.push(eq(contentPosts.assigneeUserId, filter.assigneeUserId));

  const rows = await db
    .select({
      post: contentPosts,
      spaceName: contentSpaces.name,
      assigneeName: authUsers.name,
    })
    .from(contentPosts)
    .innerJoin(contentSpaces, eq(contentSpaces.id, contentPosts.spaceId))
    .leftJoin(authUsers, eq(authUsers.id, contentPosts.assigneeUserId))
    .where(and(...conds))
    .orderBy(asc(contentPosts.scheduledAt));

  if (!rows.length) return [];

  // Eerste asset per post → thumbnail.
  const postIds = rows.map((r) => r.post.id);
  const links = await db
    .select({
      postId: contentPostAssets.postId,
      position: contentPostAssets.position,
      thumbnailR2Key: contentAssets.thumbnailR2Key,
      r2Key: contentAssets.r2Key,
      kind: contentAssets.kind,
    })
    .from(contentPostAssets)
    .innerJoin(contentAssets, eq(contentAssets.id, contentPostAssets.assetId))
    .where(inArray(contentPostAssets.postId, postIds))
    .orderBy(asc(contentPostAssets.position));
  const thumbByPost = new Map<string, string | null>();
  for (const l of links) {
    if (thumbByPost.has(l.postId)) continue;
    thumbByPost.set(l.postId, l.kind === "image" ? l.thumbnailR2Key ?? l.r2Key : l.thumbnailR2Key);
  }

  return rows.map((r) => ({
    ...r.post,
    spaceName: r.spaceName,
    assigneeName: r.assigneeName ?? null,
    thumbnailR2Key: thumbByPost.get(r.post.id) ?? null,
  }));
}

export type PostDetail = ContentPost & {
  spaceName: string;
  assigneeName: string | null;
  assets: ContentAsset[];
};

export async function getPost(id: string): Promise<PostDetail | null> {
  const [row] = await db
    .select({
      post: contentPosts,
      spaceName: contentSpaces.name,
      assigneeName: authUsers.name,
    })
    .from(contentPosts)
    .innerJoin(contentSpaces, eq(contentSpaces.id, contentPosts.spaceId))
    .leftJoin(authUsers, eq(authUsers.id, contentPosts.assigneeUserId))
    .where(eq(contentPosts.id, id))
    .limit(1);
  if (!row) return null;
  const assets = await db
    .select({ asset: contentAssets })
    .from(contentPostAssets)
    .innerJoin(contentAssets, eq(contentAssets.id, contentPostAssets.assetId))
    .where(eq(contentPostAssets.postId, id))
    .orderBy(asc(contentPostAssets.position));
  return {
    ...row.post,
    spaceName: row.spaceName,
    assigneeName: row.assigneeName ?? null,
    assets: assets.map((a) => a.asset),
  };
}

export async function createPost(args: {
  spaceId: string;
  channel: ContentPost["channel"];
  title: string;
  body?: string | null;
  status?: ContentPost["status"];
  scheduledAt?: Date | null;
  assigneeUserId?: string | null;
  assetIds?: string[];
  createdByUserId: string;
}): Promise<ContentPost> {
  const status = args.status ?? "idea";
  const [post] = await db
    .insert(contentPosts)
    .values({
      spaceId: args.spaceId,
      channel: args.channel,
      title: args.title,
      body: args.body ?? null,
      status,
      scheduledAt: args.scheduledAt ?? null,
      assigneeUserId: args.assigneeUserId ?? null,
      createdByUserId: args.createdByUserId,
    })
    .returning();

  if (args.assetIds?.length) {
    await setPostAssets(post.id, args.assetIds);
  }

  // Taak-sync: een geplande post met assignee + datum krijgt een kanban-taak.
  await syncPostTask(post, args.createdByUserId);

  await logEvent({
    action: "admin.action",
    entityType: "content_post",
    entityId: post.id,
    actorId: args.createdByUserId,
    metadata: { kind: "post_created", channel: post.channel, status },
  });
  return post;
}

export async function updatePost(
  id: string,
  patch: {
    channel?: ContentPost["channel"];
    title?: string;
    body?: string | null;
    status?: ContentPost["status"];
    scheduledAt?: Date | null;
    assigneeUserId?: string | null;
    assetIds?: string[];
  },
  actorId: string,
): Promise<ContentPost | null> {
  const before = await getPost(id);
  if (!before) return null;

  const dbPatch: Partial<typeof contentPosts.$inferInsert> = { updatedAt: new Date() };
  if (patch.channel !== undefined) dbPatch.channel = patch.channel;
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.body !== undefined) dbPatch.body = patch.body;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.scheduledAt !== undefined) dbPatch.scheduledAt = patch.scheduledAt;
  if (patch.assigneeUserId !== undefined) dbPatch.assigneeUserId = patch.assigneeUserId;
  if (patch.status === "published" && !before.publishedAt) dbPatch.publishedAt = new Date();

  const [post] = await db
    .update(contentPosts)
    .set(dbPatch)
    .where(eq(contentPosts.id, id))
    .returning();
  if (!post) return null;

  if (patch.assetIds !== undefined) {
    await setPostAssets(id, patch.assetIds);
  }

  await syncPostTask(post, actorId, before.linkedTaskId);

  await logEvent({
    action: "admin.action",
    entityType: "content_post",
    entityId: id,
    actorId,
    metadata: { kind: "post_updated", status: post.status },
  });
  return post;
}

export async function deletePost(id: string, actorId: string): Promise<void> {
  const post = await getPost(id);
  if (post?.linkedTaskId) {
    await archiveTask(post.linkedTaskId, actorId).catch(() => {});
  }
  await db.delete(contentPosts).where(eq(contentPosts.id, id));
  await logEvent({
    action: "admin.action",
    entityType: "content_post",
    entityId: id,
    actorId,
    metadata: { kind: "post_deleted" },
  });
}

// Vervangt de asset-koppelingen van een post (volgorde = array-index).
export async function setPostAssets(postId: string, assetIds: string[]): Promise<void> {
  await db.delete(contentPostAssets).where(eq(contentPostAssets.postId, postId));
  if (!assetIds.length) return;
  await db.insert(contentPostAssets).values(
    assetIds.map((assetId, i) => ({ postId, assetId, position: i })),
  );
}

// Houdt de gekoppelde kanban-taak in sync met de post. neon-http kent geen
// transacties, dus volgordelijk + herstelbaar: faalt een stap, dan logt het
// en gaat de post-mutatie niet verloren.
async function syncPostTask(
  post: ContentPost,
  actorId: string,
  existingTaskId?: string | null,
): Promise<void> {
  const taskId = existingTaskId ?? post.linkedTaskId;
  const wantsTask =
    post.status === "scheduled" && !!post.assigneeUserId && !!post.scheduledAt;

  try {
    if (!taskId && wantsTask) {
      const boardId = await ensureSpaceBoard(post.spaceId, actorId);
      if (!boardId) return;
      const task = await createTask({
        boardId,
        title: `${CHANNEL_LABEL[post.channel] ?? post.channel}: ${post.title}`,
        assigneeUserId: post.assigneeUserId,
        dueAt: post.scheduledAt,
        createdByUserId: actorId,
        description: "Geplande content (kalender).",
      });
      await db
        .update(contentPosts)
        .set({ linkedTaskId: task.id })
        .where(eq(contentPosts.id, post.id));
      return;
    }
    if (taskId) {
      if (post.status === "published") {
        await toggleTaskDone(taskId, true, actorId);
      } else if (post.status === "cancelled") {
        await archiveTask(taskId, actorId);
        await db.update(contentPosts).set({ linkedTaskId: null }).where(eq(contentPosts.id, post.id));
      } else {
        await updateTask(
          taskId,
          {
            title: `${CHANNEL_LABEL[post.channel] ?? post.channel}: ${post.title}`,
            assigneeUserId: post.assigneeUserId,
            dueAt: post.scheduledAt,
          },
          actorId,
        );
      }
    }
  } catch (e) {
    console.warn("[content] taak-sync faalde voor post", post.id, e);
  }
}

// ── Asset-requests (affiliate-checklist) ─────────────────────────────────────

export async function listRequests(spaceId: string) {
  return db
    .select()
    .from(contentAssetRequests)
    .where(eq(contentAssetRequests.spaceId, spaceId))
    .orderBy(asc(contentAssetRequests.status), asc(contentAssetRequests.dueAt));
}

export async function createRequest(args: {
  spaceId: string;
  label: string;
  description?: string | null;
  dueAt?: Date | null;
  createdByUserId: string;
}) {
  const [req] = await db
    .insert(contentAssetRequests)
    .values({
      spaceId: args.spaceId,
      label: args.label,
      description: args.description ?? null,
      dueAt: args.dueAt ?? null,
      createdByUserId: args.createdByUserId,
    })
    .returning();
  await logEvent({
    action: "admin.action",
    entityType: "content_asset_request",
    entityId: req.id,
    actorId: args.createdByUserId,
    metadata: { kind: "request_created", spaceId: args.spaceId },
  });
  return req;
}

// Markeert een request als geleverd door er een asset aan te koppelen.
export async function fulfillRequest(
  id: string,
  assetId: string,
  actorId: string | null,
) {
  const [req] = await db
    .update(contentAssetRequests)
    .set({ fulfilledAssetId: assetId, status: "delivered" })
    .where(eq(contentAssetRequests.id, id))
    .returning();
  if (req) {
    await logEvent({
      action: "admin.action",
      entityType: "content_asset_request",
      entityId: id,
      actorId,
      metadata: { kind: "request_fulfilled", assetId },
    });
  }
  return req ?? null;
}

export { CHANNEL_LABEL };
