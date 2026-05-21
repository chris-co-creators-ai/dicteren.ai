import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

// Plans match the public pricing page. Prices are concept until launch.
// Source: web/src/app/(marketing)/prijzen/page.tsx
const PLANS = [
  // Beta — gratis, 90 dagen
  {
    slug: "beta-90d",
    label: "Beta (gratis · 90 dagen)",
    customer_type: "consumer",
    period: "yearly",
    price_cents: 0,
    is_per_seat: false,
    metadata: {
      durationDays: 90,
      seatsIncluded: 1,
      maxActivationsPerSeat: 2,
      visibleInPricing: true,
      cta: "Download gratis beta",
    },
  },
  // Consumer (Persoonlijk)
  {
    slug: "consumer-monthly",
    label: "Persoonlijk maand",
    customer_type: "consumer",
    period: "monthly",
    price_cents: 1200,
    is_per_seat: false,
    metadata: { seatsIncluded: 1, maxActivationsPerSeat: 2 },
  },
  {
    slug: "consumer-quarterly",
    label: "Persoonlijk kwartaal",
    customer_type: "consumer",
    period: "quarterly",
    price_cents: 3000,
    is_per_seat: false,
    metadata: { seatsIncluded: 1, maxActivationsPerSeat: 2, savePct: 17 },
  },
  {
    slug: "consumer-yearly",
    label: "Persoonlijk jaar",
    customer_type: "consumer",
    period: "yearly",
    price_cents: 9600,
    is_per_seat: false,
    metadata: { seatsIncluded: 1, maxActivationsPerSeat: 2, savePct: 33 },
  },
  // Organization (Zakelijk) — per seat
  {
    slug: "org-monthly",
    label: "Zakelijk maand",
    customer_type: "organization",
    period: "monthly",
    price_cents: 1000,
    is_per_seat: true,
    metadata: {
      maxActivationsPerSeat: 2,
      volumeTiers: [
        { minSeats: 5, discountPct: 10 },
        { minSeats: 10, discountPct: 15 },
        { minSeats: 25, discountPct: 20 },
        { minSeats: 50, customQuote: true },
      ],
    },
  },
  {
    slug: "org-quarterly",
    label: "Zakelijk kwartaal",
    customer_type: "organization",
    period: "quarterly",
    price_cents: 2700,
    is_per_seat: true,
    metadata: {
      maxActivationsPerSeat: 2,
      volumeTiers: [
        { minSeats: 5, discountPct: 10 },
        { minSeats: 10, discountPct: 15 },
        { minSeats: 25, discountPct: 20 },
        { minSeats: 50, customQuote: true },
      ],
    },
  },
  {
    slug: "org-yearly",
    label: "Zakelijk jaar",
    customer_type: "organization",
    period: "yearly",
    price_cents: 8400,
    is_per_seat: true,
    metadata: {
      maxActivationsPerSeat: 2,
      featured: true,
      volumeTiers: [
        { minSeats: 5, discountPct: 10 },
        { minSeats: 10, discountPct: 15 },
        { minSeats: 25, discountPct: 20 },
        { minSeats: 50, customQuote: true },
      ],
    },
  },
];

for (const p of PLANS) {
  await sql`
    INSERT INTO plans (slug, label, customer_type, period, price_cents, currency, is_active, is_per_seat, metadata)
    VALUES (${p.slug}, ${p.label}, ${p.customer_type}, ${p.period}, ${p.price_cents}, 'EUR', true, ${p.is_per_seat}, ${JSON.stringify(p.metadata)}::jsonb)
    ON CONFLICT (slug) DO UPDATE SET
      label = EXCLUDED.label,
      customer_type = EXCLUDED.customer_type,
      period = EXCLUDED.period,
      price_cents = EXCLUDED.price_cents,
      is_per_seat = EXCLUDED.is_per_seat,
      metadata = EXCLUDED.metadata
  `;
  console.log(`  ✓ ${p.slug} — €${(p.price_cents / 100).toFixed(2)}${p.is_per_seat ? "/seat" : ""}`);
}

const rows = await sql`SELECT slug, label, price_cents, is_per_seat FROM plans ORDER BY customer_type, period`;
console.log(`\nPlans in DB: ${rows.length}`);
