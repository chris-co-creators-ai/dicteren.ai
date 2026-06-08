# src/lib/services/ — service-layer

## Purpose

De herbruikbare mechanics van het platform: license, token, mollie, email + orgEmail, audit, discount, trial, rateLimit, customerSource, prospectImport, en de CRM-/enrichment-services.

## Ownership

- Services zijn het "hoe". Ze kennen geen route- of UI-context; ze krijgen input en geven een `ServiceResult` terug.

## Local Contracts

- **Centrale filters horen hier.** User-facing pages doen geen eigen DB-queries; een filterregel (bv. verberg revoked race-duplicates van trial-dedupe) staat één keer in de service zodat elke page dezelfde waarheid toont.
- **Drizzle typed helpers altijd:** `eq`, `ne`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `like`, `notLike`, `and`, `or`. Raw `sql\`...\`` alleen voor wat Drizzle niet kan (window-functies, PostGIS). Een TS-valide query met foute SQL bouwt wel maar valt 500 in runtime.
- **neon-http-limieten:** geen `db.transaction()`, geen `db.query.findFirst` zonder relations-declaratie. Zie `../db/CLAUDE.md`.
- **Mollie-werk:** `mollie.ts` volgt `.claude/skills/mollie-integration.md`. Email/Resend-werk volgt `.claude/skills/resend-integration.md`.
- **Skill-koppeling:** wijzig je `prospectImport.ts` of het import-contract, werk dan `.claude/skills/clay-integration/SKILL.md` in dezelfde sessie bij.

## Verification

- `bun --conditions=react-server <script>` voor losse service-tests die een route importeren.
