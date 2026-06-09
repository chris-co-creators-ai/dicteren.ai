// Dicteren.ai — Content-management + planning (kalender, assets, taak-sync).
//
// Eén centraal model: ruimtes (intern + per affiliate), een centrale
// asset-bibliotheek op R2, posts op een kalender, en een checklist die
// affiliates invullen. Posts genereren taken op een geseed Content-bord
// (kanban) zodat kalender én takenlijst synchroon zijn. Zie
// .claude/prds/content-cms/spec.md.
import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";
import { affiliates } from "./affiliate";
import { kanbanTasks, kanbanBoards } from "./kanban";

// Social-/marketing-kanalen. Per type een eigen icoon + accentkleur in de UI.
export const contentChannel = pgEnum("content_channel", [
  "linkedin",
  "instagram",
  "tiktok",
  "snapchat",
  "youtube",
  "email_flow",
  "blog_article",
]);

export const contentSpaceKind = pgEnum("content_space_kind", [
  "internal",
  "affiliate",
]);

export const contentAssetKind = pgEnum("content_asset_kind", [
  "image",
  "video",
  "document",
]);

export const contentPostStatus = pgEnum("content_post_status", [
  "idea",
  "draft",
  "scheduled",
  "published",
  "cancelled",
]);

export const contentRequestStatus = pgEnum("content_request_status", [
  "open",
  "delivered",
]);

// Een ruimte = de interne Dicteren-ruimte óf de ruimte van één affiliate.
// Eén `internal` row geseed; één row per affiliate.
export const contentSpaces = pgTable(
  "content_spaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: contentSpaceKind("kind").notNull(),
    affiliateId: uuid("affiliate_id").references(() => affiliates.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    // Het geseede Content-bord voor deze ruimte (taak-sync). Plain uuid-FK
    // met set-null zodat een verwijderd bord de ruimte niet sloopt.
    boardId: uuid("board_id").references(() => kanbanBoards.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Eén ruimte per affiliate (Postgres telt NULLs als distinct, dus de
    // internal-ruimte met affiliateId null wordt idempotent door de service
    // geseed, niet door deze index).
    uniqueIndex("content_spaces_affiliate_uniq").on(t.affiliateId),
    index("content_spaces_kind_idx").on(t.kind),
  ],
);

// De centrale bibliotheek. De file zelf staat in R2; deze tabel is de index
// + metadata. Geüpload door een AM (uploadedByUserId) of een affiliate
// (uploadedByAffiliateId).
export const contentAssets = pgTable(
  "content_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => contentSpaces.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(
      () => authUsers.id,
      { onDelete: "set null" },
    ),
    uploadedByAffiliateId: uuid("uploaded_by_affiliate_id").references(
      () => affiliates.id,
      { onDelete: "set null" },
    ),
    kind: contentAssetKind("kind").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    r2Key: text("r2_key").notNull(),
    thumbnailR2Key: text("thumbnail_r2_key"),
    width: integer("width"),
    height: integer("height"),
    durationSec: integer("duration_sec"),
    label: text("label"),
    tags: jsonb("tags").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("content_assets_space_idx").on(t.spaceId),
    index("content_assets_kind_idx").on(t.kind),
  ],
);

// Een geplande/gemaakte post op de kalender.
export const contentPosts = pgTable(
  "content_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => contentSpaces.id, { onDelete: "cascade" }),
    channel: contentChannel("channel").notNull(),
    title: text("title").notNull(),
    // Caption / script / email-body / blog-markdown.
    body: text("body"),
    status: contentPostStatus("status").notNull().default("idea"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // De eindverantwoordelijke AM.
    assigneeUserId: uuid("assignee_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    // De gekoppelde kanban-taak (taak-sync). Set-null zodat een verwijderde
    // taak de post laat staan.
    linkedTaskId: uuid("linked_task_id").references(() => kanbanTasks.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("content_posts_space_idx").on(t.spaceId),
    index("content_posts_channel_idx").on(t.channel),
    index("content_posts_status_idx").on(t.status),
    index("content_posts_scheduled_idx").on(t.scheduledAt),
    index("content_posts_assignee_idx").on(t.assigneeUserId),
  ],
);

// Koppeltabel post ↔ asset (many-to-many). Een post gebruikt 0..n assets.
export const contentPostAssets = pgTable(
  "content_post_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => contentPosts.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => contentAssets.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    uniqueIndex("content_post_assets_uniq").on(t.postId, t.assetId),
    index("content_post_assets_post_idx").on(t.postId),
    index("content_post_assets_asset_idx").on(t.assetId),
  ],
);

// Affiliate-checklist: wat een AM van een reseller vraagt. De reseller vult
// het door een asset te uploaden en te koppelen (fulfilledAssetId).
export const contentAssetRequests = pgTable(
  "content_asset_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => contentSpaces.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    fulfilledAssetId: uuid("fulfilled_asset_id").references(
      () => contentAssets.id,
      { onDelete: "set null" },
    ),
    status: contentRequestStatus("status").notNull().default("open"),
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("content_asset_requests_space_idx").on(t.spaceId),
    index("content_asset_requests_status_idx").on(t.status),
  ],
);

export type ContentSpace = typeof contentSpaces.$inferSelect;
export type ContentAsset = typeof contentAssets.$inferSelect;
export type ContentPost = typeof contentPosts.$inferSelect;
export type ContentPostAsset = typeof contentPostAssets.$inferSelect;
export type ContentAssetRequest = typeof contentAssetRequests.$inferSelect;
