# src/app/ — App Router

## Purpose

Alle routes, pages, layouts, server-actions en API-handlers. Marketing onder `(marketing)/`, ingelogde gebruiker onder `account/`, admin onder `admin/`, machine-to-machine onder `api/`.

## Ownership

- Page-data via de service-layer (`src/lib/services/*`), niet inline `db.select()` in een `page.tsx` voor user-pages. Admin-pages mogen wel volledige queries doen voor audit-trail-zicht.

## Local Contracts

- **User-facing pages → service-layer.** Filterregels (zoals verberg-revoked-race-duplicates) horen centraal in de service, zodat elke page dezelfde waarheid toont.
- **Server-actions** dragen de domeinregels (waarom/wanneer); de mechanics komen uit services (hoe).

## Child DOX Index

- `(marketing)/CLAUDE.md` — publieke site: copy is TOV- en factcheck-gebonden.
- `admin/CLAUDE.md` — admin-dashboard; skill-update verplicht bij elke wijziging.
- `api/CLAUDE.md` — route-handlers: rate-limit, auth, webhooks, cron.

Niet apart geïndexeerd (volgen de parent-contracten): `account/`, `auth/`, `checkout/`, `trial/`, `zakelijk/`. Zij erven de service-layer-regel en de App Router-conventies hierboven.
