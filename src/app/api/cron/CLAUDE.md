# src/app/api/cron/ — geplande jobs

## Purpose

Vercel-cron-endpoints: pending-seats opruimen, invitations/orders laten verlopen, invite- en trial-reminders, maandelijkse affiliate-payout, rate-limit prunen, tiers herijken, Mollie-subs reconciliëren, signals routen, seat-warnings, commissions ontgrendelen, Instantly-webhook-events reprocessen/reconciliëren.

## Local Contracts

- **Secret-guard, geen rate-limit.** Een cron-route checkt de cron-secret (Vercel `CRON_SECRET` via `Authorization`-header), niet `enforceRateLimit`.
- **Idempotent.** Een job kan dubbel of opnieuw draaien zonder dubbele effecten (dubbele mails, dubbele payouts). Werk met status-overgangen en `WHERE`-guards.
- **Registratie:** een nieuwe cron-route ook in `vercel.json` (schedule) zetten, anders draait hij nooit.
- **neon-http kent geen `db.transaction()`** — meerdere mutaties die samen moeten slagen: zorgvuldig volgordelijk + herstelbaar maken.
