-- 0034 — Content-management + planning (kalender, assets, taak-sync)
--
-- Eén centraal model: ruimtes (intern + per affiliate), een centrale
-- asset-bibliotheek op R2 (deze tabel is de index/metadata, de file in R2),
-- posts op een kalender, en een affiliate-checklist (asset-requests).
-- Posts koppelen aan een geseed Content-bord (kanban) via linked_task_id.
-- Puur additief. Zie .claude/prds/content-cms/spec.md.

DO $$ BEGIN
  CREATE TYPE public.content_channel AS ENUM
    ('linkedin', 'instagram', 'tiktok', 'snapchat', 'youtube', 'email_flow', 'blog_article');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_space_kind AS ENUM ('internal', 'affiliate');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_asset_kind AS ENUM ('image', 'video', 'document');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_post_status AS ENUM
    ('idea', 'draft', 'scheduled', 'published', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_request_status AS ENUM ('open', 'delivered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.content_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.content_space_kind NOT NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  name text NOT NULL,
  board_id uuid REFERENCES public.kanban_boards(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS content_spaces_affiliate_uniq ON public.content_spaces (affiliate_id);
CREATE INDEX IF NOT EXISTS content_spaces_kind_idx ON public.content_spaces (kind);

CREATE TABLE IF NOT EXISTS public.content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.content_spaces(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  uploaded_by_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  kind public.content_asset_kind NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  r2_key text NOT NULL,
  thumbnail_r2_key text,
  width integer,
  height integer,
  duration_sec integer,
  label text,
  tags jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS content_assets_space_idx ON public.content_assets (space_id);
CREATE INDEX IF NOT EXISTS content_assets_kind_idx ON public.content_assets (kind);

CREATE TABLE IF NOT EXISTS public.content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.content_spaces(id) ON DELETE CASCADE,
  channel public.content_channel NOT NULL,
  title text NOT NULL,
  body text,
  status public.content_post_status NOT NULL DEFAULT 'idea',
  scheduled_at timestamptz,
  published_at timestamptz,
  assignee_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  linked_task_id uuid REFERENCES public.kanban_tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_posts_space_idx ON public.content_posts (space_id);
CREATE INDEX IF NOT EXISTS content_posts_channel_idx ON public.content_posts (channel);
CREATE INDEX IF NOT EXISTS content_posts_status_idx ON public.content_posts (status);
CREATE INDEX IF NOT EXISTS content_posts_scheduled_idx ON public.content_posts (scheduled_at);
CREATE INDEX IF NOT EXISTS content_posts_assignee_idx ON public.content_posts (assignee_user_id);

CREATE TABLE IF NOT EXISTS public.content_post_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.content_assets(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS content_post_assets_uniq ON public.content_post_assets (post_id, asset_id);
CREATE INDEX IF NOT EXISTS content_post_assets_post_idx ON public.content_post_assets (post_id);
CREATE INDEX IF NOT EXISTS content_post_assets_asset_idx ON public.content_post_assets (asset_id);

CREATE TABLE IF NOT EXISTS public.content_asset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.content_spaces(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  due_at timestamptz,
  fulfilled_asset_id uuid REFERENCES public.content_assets(id) ON DELETE SET NULL,
  status public.content_request_status NOT NULL DEFAULT 'open',
  created_by_user_id uuid REFERENCES auth."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_asset_requests_space_idx ON public.content_asset_requests (space_id);
CREATE INDEX IF NOT EXISTS content_asset_requests_status_idx ON public.content_asset_requests (status);
