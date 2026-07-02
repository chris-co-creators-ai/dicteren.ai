-- 0054 — Inbound advertising: de Google Ads-datalaag onder /admin/inbound.
-- Sync-tabellen (accounts/campaigns/groups/keywords/search-terms/metrics),
-- Vicky's proposals met de approval-FSM, en de landingpage-koppeling.
-- Geldbedragen in micros (÷1e6 = EUR), rates 0–1: de ruwe API v24-shapes.

CREATE TYPE "ad_entity_status" AS ENUM ('ENABLED', 'PAUSED', 'REMOVED');
CREATE TYPE "ad_channel_type" AS ENUM ('SEARCH', 'PERFORMANCE_MAX', 'DISPLAY');
CREATE TYPE "ad_match_type" AS ENUM ('EXACT', 'PHRASE', 'BROAD');
CREATE TYPE "ad_keyword_intent" AS ENUM ('brand', 'problem', 'solution', 'competitor', 'local');
CREATE TYPE "ad_search_term_status" AS ENUM ('ADDED', 'EXCLUDED', 'NONE');
CREATE TYPE "ad_metrics_level" AS ENUM ('account', 'campaign', 'ad_group', 'keyword');
CREATE TYPE "ad_proposal_type" AS ENUM ('new_campaign', 'new_keyword', 'negative_keyword', 'budget_change', 'pause', 'bid_change');
CREATE TYPE "ad_proposal_status" AS ENUM ('draft', 'proposed', 'approved', 'applied', 'rejected');

CREATE TABLE "ad_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" text NOT NULL,
  "login_customer_id" text,
  "descriptive_name" text,
  "currency" text NOT NULL DEFAULT 'EUR',
  "geo" text NOT NULL DEFAULT 'Nederland',
  "token_access" text NOT NULL DEFAULT 'test',
  "sync_enabled" boolean NOT NULL DEFAULT false,
  "last_sync_at" timestamptz,
  "last_sync_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ad_accounts_customer_idx" ON "ad_accounts" ("customer_id");

CREATE TABLE "ad_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "ad_accounts"("id") ON DELETE CASCADE,
  "google_id" text NOT NULL,
  "name" text NOT NULL,
  "status" "ad_entity_status" NOT NULL,
  "channel_type" "ad_channel_type" NOT NULL,
  "bidding_strategy_type" text,
  "budget_micros" bigint,
  "start_date" date,
  "end_date" date,
  "synced_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ad_campaigns_google_idx" ON "ad_campaigns" ("account_id", "google_id");
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns" ("status");

CREATE TABLE "ad_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
  "google_id" text NOT NULL,
  "name" text NOT NULL,
  "status" "ad_entity_status" NOT NULL,
  "synced_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ad_groups_google_idx" ON "ad_groups" ("campaign_id", "google_id");

CREATE TABLE "ad_keywords" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ad_group_id" uuid NOT NULL REFERENCES "ad_groups"("id") ON DELETE CASCADE,
  "google_criterion_id" text NOT NULL,
  "text" text NOT NULL,
  "match_type" "ad_match_type" NOT NULL,
  "intent" "ad_keyword_intent",
  "status" "ad_entity_status" NOT NULL,
  "quality_score" integer,
  "is_negative" boolean NOT NULL DEFAULT false,
  "synced_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ad_keywords_google_idx" ON "ad_keywords" ("ad_group_id", "google_criterion_id");
CREATE INDEX "ad_keywords_intent_idx" ON "ad_keywords" ("intent");

CREATE TABLE "ad_search_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
  "term" text NOT NULL,
  "triggered_by_keyword" text,
  "match_type" "ad_match_type",
  "status" "ad_search_term_status" NOT NULL DEFAULT 'NONE',
  "clicks" integer NOT NULL DEFAULT 0,
  "cost_micros" bigint NOT NULL DEFAULT 0,
  "conversions" double precision NOT NULL DEFAULT 0,
  "synced_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ad_search_terms_term_idx" ON "ad_search_terms" ("campaign_id", "term");
CREATE INDEX "ad_search_terms_status_idx" ON "ad_search_terms" ("status");

CREATE TABLE "ad_metrics_daily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "ad_accounts"("id") ON DELETE CASCADE,
  "level" "ad_metrics_level" NOT NULL,
  "level_google_id" text NOT NULL,
  "date" date NOT NULL,
  "impressions" bigint NOT NULL DEFAULT 0,
  "clicks" bigint NOT NULL DEFAULT 0,
  "cost_micros" bigint NOT NULL DEFAULT 0,
  "conversions" double precision NOT NULL DEFAULT 0,
  "conversions_value_micros" bigint NOT NULL DEFAULT 0,
  "ctr" double precision,
  "average_cpc_micros" bigint,
  "search_impression_share" double precision,
  "search_budget_lost_impression_share" double precision,
  "search_rank_lost_impression_share" double precision,
  "absolute_top_impression_percentage" double precision,
  "synced_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ad_metrics_daily_key_idx" ON "ad_metrics_daily" ("level", "level_google_id", "date");
CREATE INDEX "ad_metrics_daily_date_idx" ON "ad_metrics_daily" ("date");
CREATE INDEX "ad_metrics_daily_account_idx" ON "ad_metrics_daily" ("account_id");

CREATE TABLE "ad_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "ad_accounts"("id") ON DELETE CASCADE,
  "type" "ad_proposal_type" NOT NULL,
  "status" "ad_proposal_status" NOT NULL DEFAULT 'proposed',
  "finding" text NOT NULL,
  "proposal" text NOT NULL,
  "impact" text,
  "rationale" jsonb,
  "payload" jsonb NOT NULL,
  "created_by_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "agent_run_id" uuid REFERENCES "agent_runs"("id") ON DELETE SET NULL,
  "approved_by_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "approved_at" timestamptz,
  "rejected_at" timestamptz,
  "rejection_note" text,
  "applied_at" timestamptz,
  "applied_resource_id" text,
  "apply_result" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "ad_proposals_status_idx" ON "ad_proposals" ("status");
CREATE INDEX "ad_proposals_account_idx" ON "ad_proposals" ("account_id");
CREATE INDEX "ad_proposals_created_idx" ON "ad_proposals" ("created_at");

CREATE TABLE "ad_landing_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
  "path" text NOT NULL,
  "utm" jsonb,
  "message_match_score" double precision,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "ad_landing_pages_key_idx" ON "ad_landing_pages" ("campaign_id", "path");

-- Seed: het gekoppelde account (feiten, geen sample-data). Sync blijft uit tot
-- het developer-token Basic access heeft en de credentials in Vercel staan.
INSERT INTO "ad_accounts" ("customer_id", "login_customer_id", "descriptive_name")
VALUES ('7132988127', '4855712942', 'Dicteren.ai (info@dicteren.ai)')
ON CONFLICT DO NOTHING;
