-- 0025 — Editbare prijs-SSOT (zakelijke staffel + periode-premies)
--
-- Verplaatst de zakelijke staffel uit hardcoded services/pricingTiers.ts naar
-- de DB zodat admin (en per-klant de AM) de prijs kan wijzigen zonder deploy.
-- De service leest deze tabellen met cache + fallback naar dezelfde defaults,
-- dus deze migratie is additief en breekt niks tot de code 'm uitleest.

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_seats integer NOT NULL,
  max_seats integer,
  price_per_seat_cents integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_settings (
  id integer PRIMARY KEY DEFAULT 1,
  quarterly_premium_pct integer NOT NULL DEFAULT 25,
  monthly_premium_pct integer NOT NULL DEFAULT 50,
  custom_quote_from integer NOT NULL DEFAULT 50,
  currency text NOT NULL DEFAULT 'EUR',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_settings_singleton CHECK (id = 1)
);

-- Seed: huidige zakelijke staffel (jaar/seat) + premie-defaults.
INSERT INTO public.pricing_tiers (min_seats, max_seats, price_per_seat_cents, sort_order)
VALUES
  (1, 4, 12000, 0),
  (5, 9, 10800, 1),
  (10, 24, 10200, 2),
  (25, 49, 9600, 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.pricing_settings (id, quarterly_premium_pct, monthly_premium_pct, custom_quote_from, currency)
VALUES (1, 25, 50, 50, 'EUR')
ON CONFLICT (id) DO NOTHING;
