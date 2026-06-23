-- 0048_referral_program.sql
-- PRD vrienden-uitnodigen: refer-a-friend met gratis maanden (Wispr-model), additief.
-- Apart van affiliates (= cash-reseller-programma). Enums idempotent via DO-block.

-- Persoonlijke invite-code op auth.user (lazy-gegenereerd, server-set).
ALTER TABLE auth."user" ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS auth_user_referral_code_unique
  ON auth."user"(referral_code);

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM ('pending','qualified','void');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE referral_source AS ENUM ('link','code');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE referral_reward_role AS ENUM ('referrer','referred');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE referral_reward_status AS ENUM ('pending','applied','void');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  referred_email text,
  referrer_code text,
  status referral_status NOT NULL DEFAULT 'pending',
  source referral_source NOT NULL DEFAULT 'link',
  created_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_unique ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth."user"(id) ON DELETE CASCADE,
  role referral_reward_role NOT NULL,
  months integer NOT NULL DEFAULT 1,
  status referral_reward_status NOT NULL DEFAULT 'pending',
  apply_method text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_referral_role_unique
  ON referral_rewards(referral_id, role);
CREATE INDEX IF NOT EXISTS referral_rewards_user_idx ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS referral_rewards_status_idx ON referral_rewards(status);
