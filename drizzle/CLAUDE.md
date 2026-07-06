# drizzle/ — SQL-migraties

## Purpose

De genummerde SQL-migraties (`0000_...sql` oplopend) plus `meta/` voor de Drizzle-snapshots. Dit is de geschiedenis van het productie-schema.

## Ownership

- Migraties zijn append-only en oplopend genummerd. Een bestaande migratie wijzig je niet; je voegt een nieuwe toe.

## Local Contracts

- **Geen `drizzle-kit push`** tegen productie. Migraties worden expliciet toegepast.
- **Destructieve migraties** (DROP TABLE / TRUNCATE / UPDATE zonder WHERE) en elke productie-migratie: eerst Christians expliciete go. Dit is een mandatory stop.
- **Schema en migratie lopen samen op:** wijzig je `src/lib/db/schema/*`, lever dan de bijbehorende migratie hier mee.
- **Jarvis/CENTER/Instantly migraties:** wijzigingen aan `instantly_webhook_events`, CRM lifecycle enumwaarden of contact-suppressionvelden moeten ook `docs/jarvis-center-bridge/implementation-map.md` bijwerken.
