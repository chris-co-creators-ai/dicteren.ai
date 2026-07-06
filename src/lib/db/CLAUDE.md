# src/lib/db/ — database

## Purpose

De Drizzle-schema-definities (`schema/`) en de Neon-Postgres-client. Better Auth leeft in het `auth.*`-schema.

## Ownership

- Schema-wijzigingen gaan gepaard met een migratie in `web/drizzle/` (zie `../../../drizzle/CLAUDE.md`). Geen `drizzle-kit push` tegen productie.

## Local Contracts

- **neon-http-driver:** geen `db.transaction()`, en `db.query.findFirst` werkt alleen met gedeclareerde relations.
- **Better Auth additionalFields:** elke niet-core kolom op `auth.user` MOET in `user.additionalFields` van de Better Auth-config staan, anders faalt sign-up (P0). Voorbeeld: `email_normalized`.
- **Anti-misbruik e-mail:** `email_normalized` heeft een UNIQUE INDEX (plus-strip + disposable-block). Gmail-dots blijven aparte accounts, dus géén dot-strip.
- **Trials zijn consumer-licenties** met status `trial` (prefix `DIC-TRIAL-`), nooit type `beta`. De enum-waarde `beta` blijft ongebruikt.
- **Typed helpers** voor alle queries; raw `sql\`...\`` alleen voor wat Drizzle niet kan.
- **CRM/Instantly schema:** lifecycle-events, webhook audit en suppressionvelden horen consistent te blijven met `docs/jarvis-center-bridge/implementation-map.md` en de MCP-toolcontracten. Suppressionvelden zijn harde outbound-gates.

## Verification

- `bun run build` moet schoon zijn; let op: een TS-valide maar SQL-foute query slaagt voor build en valt 500 in runtime.
