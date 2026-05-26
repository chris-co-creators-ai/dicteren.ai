-- 0011 — Per-seat zakelijke licenties
--
-- Shift weg van pool-model (1 license, seats=N, maxActivationsPerSeat=2)
-- naar per-seat model (N licenses, seats=1, eigen code, eigen userId).
--
-- 10 seats = 10 codes = 10 members = max 20 devices (2 per seat).
--
-- Wijzigingen:
--   1. license_status enum krijgt 'unassigned' en 'pending_payment'
--   2. licenses krijgt invitation_id, assigned_at, seat_label
--   3. subscriptions krijgt mollie_interval_changed_at
--   4. nieuwe tabel org_subscription_history (audit van seat-mutaties)
--
-- Bestaande pool-team-licenses worden in een aparte migratie (0012 of
-- via script) gesplitst naar per-seat. Deze migration is non-destructive.

-- ───── 1. license_status enum — nieuwe waarden ──────────────
-- ALTER TYPE ADD VALUE is non-transactional in Postgres < 14.
-- IF NOT EXISTS guard zodat re-run veilig is.

ALTER TYPE "license_status" ADD VALUE IF NOT EXISTS 'unassigned';
ALTER TYPE "license_status" ADD VALUE IF NOT EXISTS 'pending_payment';

-- ───── 2. licenses — nieuwe kolommen ────────────────────────

ALTER TABLE "public"."licenses"
  ADD COLUMN IF NOT EXISTS "invitation_id" uuid;

ALTER TABLE "public"."licenses"
  ADD COLUMN IF NOT EXISTS "assigned_at" timestamptz;

ALTER TABLE "public"."licenses"
  ADD COLUMN IF NOT EXISTS "seat_label" text;

-- FK naar auth.invitation. ON DELETE SET NULL: als invite geannuleerd
-- of verlopen wordt en uit auth.invitation verdwijnt, blijft de
-- licenses-rij bestaan met invitation_id = NULL (= unassigned seat).
ALTER TABLE "public"."licenses"
  DROP CONSTRAINT IF EXISTS "licenses_invitation_id_auth_invitation_id_fk";
ALTER TABLE "public"."licenses"
  ADD CONSTRAINT "licenses_invitation_id_auth_invitation_id_fk"
    FOREIGN KEY ("invitation_id") REFERENCES "auth"."invitation"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "licenses_invitation_idx"
  ON "public"."licenses" ("invitation_id");
CREATE INDEX IF NOT EXISTS "licenses_org_status_idx"
  ON "public"."licenses" ("organization_id", "status");

-- ───── 3. subscriptions — tracking van Mollie replaces ──────

ALTER TABLE "public"."subscriptions"
  ADD COLUMN IF NOT EXISTS "mollie_interval_changed_at" timestamptz;

-- ───── 4. org_subscription_history ──────────────────────────
-- Audit-trail voor seat-mutaties + tier-overgangen. Eén row per
-- self-service of admin actie. Bron voor MRR-history widget.

CREATE TABLE IF NOT EXISTS "public"."org_subscription_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "auth"."organization"("id") ON DELETE CASCADE,
  "old_seats" integer NOT NULL,
  "new_seats" integer NOT NULL,
  "old_amount_cents" integer NOT NULL,
  "new_amount_cents" integer NOT NULL,
  "old_tier" text,
  "new_tier" text,
  "old_mollie_subscription_id" text,
  "new_mollie_subscription_id" text,
  "prorata_charge_cents" integer,
  "prorata_payment_id" text,
  "reason" text NOT NULL,
  "actor_user_id" uuid REFERENCES "auth"."user"("id") ON DELETE SET NULL,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "org_sub_history_org_idx"
  ON "public"."org_subscription_history" ("organization_id");
CREATE INDEX IF NOT EXISTS "org_sub_history_created_idx"
  ON "public"."org_subscription_history" ("created_at" DESC);

-- ───── 5. org_seat_warnings ─────────────────────────────────
-- Dedup-tabel voor seat-warning-emails (daily cron schrijft hier
-- de timestamp wanneer 80%/100% threshold getriggerd is).

CREATE TABLE IF NOT EXISTS "public"."org_seat_warnings" (
  "organization_id" uuid PRIMARY KEY REFERENCES "auth"."organization"("id") ON DELETE CASCADE,
  "warned_at_80" timestamptz,
  "warned_at_100" timestamptz,
  "last_reset_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ───── 6. invite_reminders_sent ─────────────────────────────
-- Dedup-tabel voor invite-reminder-emails. Stuurt 1× na 24u.

CREATE TABLE IF NOT EXISTS "public"."invite_reminders_sent" (
  "invitation_id" uuid PRIMARY KEY REFERENCES "auth"."invitation"("id") ON DELETE CASCADE,
  "reminder_sent_at" timestamptz NOT NULL DEFAULT now()
);

-- Idempotent: indexes ALTER/CREATE met IF NOT EXISTS.
