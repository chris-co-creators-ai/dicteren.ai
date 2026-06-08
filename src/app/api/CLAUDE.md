# src/app/api/ — route-handlers

## Purpose

Machine-to-machine endpoints: licentie-activatie/status/trial, checkout, Mollie-webhook, Resend-webhook, auth-passthrough, admin-API, organisatie-/seat-beheer, cron-jobs.

## Ownership

- Elke handler retourneert een `ServiceResult`-vormig antwoord en leunt op de service-layer voor mechanics.

## Local Contracts

- **Rate-limit verplicht** op elke nieuwe `route.ts` die niet cron / webhook / admin is. Direct na de signature, vóór session-check of body-parse: `enforceRateLimit(request, bucket)`. Nieuwe bucket toevoegen aan de `RATE_LIMITS`-config in `src/lib/services/rateLimit.ts` (de canonieke lijst), geen inline `checkRateLimit`. Zie `.claude/skills/rate-limit.md`.
- **Auth:** beschermde routes checken de Better Auth-sessie. Admin-routes checken bovendien staff-permissions.
- **Drizzle:** typed helpers (`eq`, `inArray`, `isNull`, `and`, `or`...), geen raw `sql\`...\`` tenzij echt nodig. neon-http-driver kent geen `db.transaction()`. Zie `src/lib/db/CLAUDE.md`.

## Child DOX Index

- `cron/CLAUDE.md` — geplande jobs: secret-guard, idempotent, geen rate-limit.
- `mollie/CLAUDE.md` — de betaal-webhook; Mollie-skill leidend.
