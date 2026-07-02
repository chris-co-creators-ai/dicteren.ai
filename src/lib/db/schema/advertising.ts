// Dicteren.ai — Inbound advertising: de Google Ads-datalaag onder /admin/inbound.
//
// De cron-sync (google-ads-api, read) vult ad_campaigns/ad_groups/ad_keywords/
// ad_search_terms/ad_metrics_daily uit het live account; de UI leest uitsluitend
// deze tabellen (nooit live de API per pageload). Vicky (PPC-agent) schrijft
// alleen ad_proposals — de status-FSM (draft→proposed→approved→applied/rejected)
// is de approval-gate: uitsluitend status=approved mag door de write-laag naar
// Google. Geldbedragen zijn *_micros (÷1e6 = EUR), rates 0–1 — de ruwe
// Google Ads API v24-shapes, geen afgeleide kolommen.
import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  date,
  integer,
  bigint,
  doublePrecision,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-bridge";
import { agentRuns } from "./agentRuns";

// ─── Enums (Google Ads API-waarden + onze eigen vocabulaires) ───

export const adEntityStatus = pgEnum("ad_entity_status", [
  "ENABLED",
  "PAUSED",
  "REMOVED",
]);

export const adChannelType = pgEnum("ad_channel_type", [
  "SEARCH",
  "PERFORMANCE_MAX",
  "DISPLAY",
]);

export const adMatchType = pgEnum("ad_match_type", [
  "EXACT",
  "PHRASE",
  "BROAD",
]);

// Onze intent-labeling (niet van Google): de as waarop Vicky clustert en rapporteert.
export const adKeywordIntent = pgEnum("ad_keyword_intent", [
  "brand",
  "problem",
  "solution",
  "competitor",
  "local",
]);

export const adSearchTermStatus = pgEnum("ad_search_term_status", [
  "ADDED",
  "EXCLUDED",
  "NONE",
]);

export const adMetricsLevel = pgEnum("ad_metrics_level", [
  "account",
  "campaign",
  "ad_group",
  "keyword",
]);

export const adProposalType = pgEnum("ad_proposal_type", [
  "new_campaign",
  "new_keyword",
  "negative_keyword",
  "budget_change",
  "pause",
  "bid_change",
]);

export const adProposalStatus = pgEnum("ad_proposal_status", [
  "draft",
  "proposed",
  "approved",
  "applied",
  "rejected",
]);

// ─── Account ───

export const adAccounts = pgTable(
  "ad_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Numerieke string zonder streepjes, bv. "7132988127" (info@dicteren.ai).
    customerId: text("customer_id").notNull(),
    // MCC waar het developer-token onder hangt (co-creatie.ai).
    loginCustomerId: text("login_customer_id"),
    descriptiveName: text("descriptive_name"),
    currency: text("currency").notNull().default("EUR"),
    geo: text("geo").notNull().default("Nederland"),
    // "test" tot het developer-token Basic access heeft; de UI toont de banner hierop.
    tokenAccess: text("token_access").notNull().default("test"),
    syncEnabled: boolean("sync_enabled").notNull().default(false),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ad_accounts_customer_idx").on(t.customerId)],
);

// ─── Gesyncte Google Ads-entiteiten ───

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => adAccounts.id, { onDelete: "cascade" }),
    // campaign.id uit de API — de join-sleutel bij elke sync-upsert.
    googleId: text("google_id").notNull(),
    name: text("name").notNull(),
    status: adEntityStatus("status").notNull(),
    channelType: adChannelType("channel_type").notNull(),
    biddingStrategyType: text("bidding_strategy_type"),
    budgetMicros: bigint("budget_micros", { mode: "number" }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ad_campaigns_google_idx").on(t.accountId, t.googleId),
    index("ad_campaigns_status_idx").on(t.status),
  ],
);

export const adGroups = pgTable(
  "ad_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    googleId: text("google_id").notNull(),
    name: text("name").notNull(),
    status: adEntityStatus("status").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ad_groups_google_idx").on(t.campaignId, t.googleId)],
);

export const adKeywords = pgTable(
  "ad_keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adGroupId: uuid("ad_group_id")
      .notNull()
      .references(() => adGroups.id, { onDelete: "cascade" }),
    // ad_group_criterion criterion_id uit de API.
    googleCriterionId: text("google_criterion_id").notNull(),
    text: text("text").notNull(),
    matchType: adMatchType("match_type").notNull(),
    // Door Vicky gezet bij het voorstel of via sync-verrijking; nooit door Google geleverd.
    intent: adKeywordIntent("intent"),
    status: adEntityStatus("status").notNull(),
    qualityScore: integer("quality_score"),
    isNegative: boolean("is_negative").notNull().default(false),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ad_keywords_google_idx").on(t.adGroupId, t.googleCriterionId),
    index("ad_keywords_intent_idx").on(t.intent),
  ],
);

export const adSearchTerms = pgTable(
  "ad_search_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    // segments.keyword.info.text — welk keyword de vertoning triggerde.
    triggeredByKeyword: text("triggered_by_keyword"),
    matchType: adMatchType("match_type"),
    status: adSearchTermStatus("status").notNull().default("NONE"),
    // Venster-totalen van de sync (search_term_view over de sync-range).
    clicks: integer("clicks").notNull().default(0),
    costMicros: bigint("cost_micros", { mode: "number" }).notNull().default(0),
    conversions: doublePrecision("conversions").notNull().default(0),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ad_search_terms_term_idx").on(t.campaignId, t.term),
    index("ad_search_terms_status_idx").on(t.status),
  ],
);

// ─── Tijdreeks: één rij per (niveau, entiteit, dag) — het "verloop over tijd" ───

export const adMetricsDaily = pgTable(
  "ad_metrics_daily",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => adAccounts.id, { onDelete: "cascade" }),
    level: adMetricsLevel("level").notNull(),
    // Het Google-id van de entiteit op dat niveau; customer_id op account-niveau.
    levelGoogleId: text("level_google_id").notNull(),
    date: date("date").notNull(),
    impressions: bigint("impressions", { mode: "number" }).notNull().default(0),
    clicks: bigint("clicks", { mode: "number" }).notNull().default(0),
    costMicros: bigint("cost_micros", { mode: "number" }).notNull().default(0),
    conversions: doublePrecision("conversions").notNull().default(0),
    conversionsValueMicros: bigint("conversions_value_micros", { mode: "number" })
      .notNull()
      .default(0),
    ctr: doublePrecision("ctr"),
    averageCpcMicros: bigint("average_cpc_micros", { mode: "number" }),
    searchImpressionShare: doublePrecision("search_impression_share"),
    searchBudgetLostImpressionShare: doublePrecision(
      "search_budget_lost_impression_share",
    ),
    searchRankLostImpressionShare: doublePrecision(
      "search_rank_lost_impression_share",
    ),
    absoluteTopImpressionPercentage: doublePrecision(
      "absolute_top_impression_percentage",
    ),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ad_metrics_daily_key_idx").on(t.level, t.levelGoogleId, t.date),
    index("ad_metrics_daily_date_idx").on(t.date),
    index("ad_metrics_daily_account_idx").on(t.accountId),
  ],
);

// ─── Proposals: Vicky's enige schrijf-pad, met de approval-FSM ───

export const adProposals = pgTable(
  "ad_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => adAccounts.id, { onDelete: "cascade" }),
    type: adProposalType("type").notNull(),
    status: adProposalStatus("status").notNull().default("proposed"),
    // De bevinding mét het cijfer ("Zoekterm X kostte €181 over 14d, 0 conv").
    finding: text("finding").notNull(),
    // De concrete actie in één zin.
    proposal: text("proposal").notNull(),
    // De verwachte uitkomst ("≈ €181/14d bespaard").
    impact: text("impact"),
    // { keyword, intent, campaign } — de context voor de reviewer.
    rationale: jsonb("rationale"),
    // De mutate-payload per type; het schema staat in vocab/proposal-types
    // (.claude/skills/vicky/references/system-function-calling.md).
    payload: jsonb("payload").notNull(),
    // Agent-user (Vicky) of staff die het voorstel maakte.
    createdByUserId: uuid("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    // De Vicky-run waaruit dit voorstel kwam; null bij handmatige voorstellen.
    agentRunId: uuid("agent_run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    approvedByUserId: uuid("approved_by_user_id").references(
      () => authUsers.id,
      { onDelete: "set null" },
    ),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionNote: text("rejection_note"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    // Het Google Ads resource-id na toepassen ("customers/.../campaignCriteria/...").
    appliedResourceId: text("applied_resource_id"),
    // Ruwe mutate-response of fout — audit-trail van de write-laag.
    applyResult: jsonb("apply_result"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ad_proposals_status_idx").on(t.status),
    index("ad_proposals_account_idx").on(t.accountId),
    index("ad_proposals_created_idx").on(t.createdAt),
  ],
);

// ─── Landingpages: campagne ↔ pagina ↔ UTM (message-match-tracking) ───

export const adLandingPages = pgTable(
  "ad_landing_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    // Pad op dicteren.ai, bv. "/wispr-flow-alternatief" of "/lp/<slug>".
    path: text("path").notNull(),
    // De vaste UTM-set van de ad-URL's naar deze pagina.
    utm: jsonb("utm"),
    // 0–1, door Vicky beoordeeld: sluit de pagina aan op de advertentie?
    messageMatchScore: doublePrecision("message_match_score"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("ad_landing_pages_key_idx").on(t.campaignId, t.path)],
);

export type AdAccount = typeof adAccounts.$inferSelect;
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type AdGroup = typeof adGroups.$inferSelect;
export type AdKeyword = typeof adKeywords.$inferSelect;
export type AdSearchTerm = typeof adSearchTerms.$inferSelect;
export type AdMetricsDaily = typeof adMetricsDaily.$inferSelect;
export type AdProposal = typeof adProposals.$inferSelect;
export type AdLandingPage = typeof adLandingPages.$inferSelect;
export type NewAdProposal = typeof adProposals.$inferInsert;
