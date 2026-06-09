# src/app/admin/ — admin-dashboard

## Purpose

Het interne dashboard: licenties, CRM (consumenten + organisaties + partners), orders, facturen, analytics, support, kortingen, e-mails, prijzen, affiliates, taken, borden (interne Kanban), instellingen, staff. Donkere thema-variant.

## Ownership

- `.claude/skills/admin-dashboard.md` is de feitelijke inventaris van alle admin-pages (routes, services, KPI's, tabs, knoppen, server-actions, schema-relaties). Die skill is source-of-truth en mag niet driften.

## Local Contracts

- **Skill-update verplicht bij elke `/admin/**`-wijziging, in dezelfde sessie.** Niet bewaren voor de handoff. Datum + commit-sha in de header.
- **Geen detail-pages** per entity (`admin/<entity>/[id]/page.tsx` als losse pagina): gebruik een side-panel / drawer. Side-panel boven modal voor entity-flows, tab boven sub-route voor verwante views.
- **Geen mock-data.** Alle pages draaien op live DB-data; lege state in plaats van mock-rijen.
- **Admin-pages mogen volledige DB-queries doen** voor audit-trail-zicht (uitzondering op de user-page-service-layer-regel).
- **GTM-bron in één blik:** waar een klant/organisatie vandaan komt (source-tracking) moet zichtbaar zijn. `customerSource.ts` + `SourceBadge` zijn de canonieke bron.
- **Minder routes, minder ruis:** als staff al in `settings/staff` zit, hoort het niet ook in `users`. Geen dubbele weergaven.
- **Nieuwe + geplande systemen:** `/admin/borden` is het interne Kanban-team-taken-systeem (live; service `kanban.ts`, API `/api/admin/kanban/**`, schema `kanban.ts` migratie 0033 — zie de admin-skill). Content-planning/CMS (kalender + asset-bibliotheek op R2 + affiliate-sync) is volledig ontworpen in `.claude/prds/content-cms/spec.md` (PRD, nog niet gebouwd, migratie-go vooraf gegeven). Beide synchroniseren met de persoonlijke takenlijst via `/admin/taken` + `listAssignedTasks`.

## Verification

- `bun run build` + browser-check op de gewijzigde admin-page tegen live data.
