# src/lib/ — niet-UI-kern

## Purpose

De logica-laag onder de UI: services (herbruikbare mechanics), db (schema + client), config (plannen/prijzen), auth (Better Auth), types, content (kennisbank), consent.

## Ownership

- Dit is de "hoe"-laag. Domeinregels (waarom/wanneer) horen in server-actions/route-handlers; herbruikbare mechanica hier.

## Local Contracts

- **Server-only code** blijft server-only. `import "server-only"` waar het hoort; let op dat dit `bun`-testscripts breekt tenzij je `bun --conditions=react-server` gebruikt.
- **Eén waarheid per begrip:** geen synoniem-services voor hetzelfde domein. Zoek een bestaande service vóór je een nieuwe maakt.

## Child DOX Index

- `services/CLAUDE.md` — de service-layer: mechanics, ServiceResult, centrale filters.
- `db/CLAUDE.md` — Drizzle-schema, neon-http-client en de query-regels.
- `content/kennisbank/CLAUDE.md` — de kennisbank-SSOT.

Niet apart geïndexeerd: `config/` (plan- en prijs-defaults), `auth/` (Better Auth-config; zie de schema-regel in `db/CLAUDE.md`), `types/`, `consent/`. Volgen de contracten hierboven.
