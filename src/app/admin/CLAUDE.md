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
- **Gedeelde pijplijn, geen per-AM owner-scope** (besluit Christian): personen, organisaties, KPI's en leadlijsten zijn voor alle AM's zichtbaar; elke AM mag (her)toewijzen. Live-refresh via 15s-polling + on-focus (geen websockets — Vercel serverless), gepauzeerd tijdens typen.
- **Call-dispositions zijn SSOT** in `services/crmCallDisposition.ts`: UI-dropdown, API-validatie, timeline-labels en taak-aanmaak lezen allemaal daaruit — geen string-literals elders. Een dispositie logt altijd een `crm_event` en zet evt. een vervolgtaak, maar **raakt de stage nooit aan**; stages wijzigt de AM zelf. Permanente flags: `do_not_call`, `wrong_number` (migratie 0036).
- **Stage-gates server-side** (`services/stageGates.ts`): verplichte velden per pijplijn-stage, FSM-afgedwongen op side-panel én kanban-drag. Achteruit of naar `lost` mag altijd; `reseller` is een parallel spoor zonder extra verplichte velden.
- **Funnel-split (migratie 0052):** `crm_contacts.prospect_type` (`eindklant`|`reseller`) is de discriminator die eindklant- van reseller-werving scheidt. Het Kanban heeft een Eindklant|Reseller-toggle (server-filter: laadt het hele spoor in één keer, limit 1000, geen paginering; de toggle-tellingen komen uit `countProspectsByType`). Het eindklant-bord toont de sleepbare customer-stages. Het reseller-bord toont **exact** de 7-stage partner-funnel uit `partnerFunnelShared.ts` (`FUNNEL_TRACK` + `deriveFunnelColumn`) + een "Niet nu"-zijspoor: Nieuw → Deck verstuurd → Deck bekeken → Geïnteresseerde partner → Afspraak rond → Brand identity controleren → Actieve partner. Het is **read-only** (voortgang via de Partner-tab, niet via slepen — géén aparte stage-enum). Dezelfde afleiding als de Partner-cockpit, geen drift; de batch-loader is `funnelColumnsByContactIds` in `partnerFunnel.ts`. De **Partner-tab** in het personen-side-panel toont voorlopig voor **alle** prospects (verbergen op `prospect_type` zou de halve partner-pipeline verstoppen zolang nog niet alles geclassificeerd is); de reseller-only-beperking komt pas terug ná classificatie. `lead_lists.list_type` zet de default voor nieuwe imports. Classificeren: bulk "Set funnel" (`/api/admin/crm/contacts/prospect-type`) of "Hele lijst → funnel" (`/api/admin/lead-lists/[id]/prospect-type`), services in `crmAssign.ts`. Raakt de bestaande reseller-flow (deck/mails/promote) niet.
- **Reseller-traject** via `services/resellerFlow.ts` (guards in de service, elke route zelfde waarheid): configureerbare onboarding-checklist (`crm_reseller_steps`), org-documenten op R2 (`crm_org_attachments`, signed up/downloads via `services/r2.ts`) en promotie naar een affiliate-account (`promoted_affiliate_id`) — migratie 0037. Commissievelden (`reseller_commission_pct`, `reseller_recurring`, `reseller_expected_clients`) op de org.
- **Bel-cockpit voor AM koude verkoop:** belronde-presets (kolomvoorkeuren in `columnPrefsShared.ts`), org-side-panel altijd zichtbaar in Personen, tabs Belscript/FAQ/Reseller (`call_script`, `reseller_notes`, `crm_faq` — migratie 0032), disposities als inline quick-actions, opt-out-gate.
- **Contactpersoon is een first-class veld** op de org (sectie bovenaan de Details-tab; kolommen in personen-grid incl. e-mail/telefoon/`mobile_phone` — migraties 0031/0038). Dode custom kolommen zijn vervangen door echte org-velden; nieuwe default-kolommen worden gemerged in bestaande kolomvoorkeuren.
- **Live systemen:** `/admin/borden` — intern Kanban-team-taken-systeem (service `kanban.ts`, API `/api/admin/kanban/**`, migratie 0033; taak-bijlagen/screenshots migratie 0035, bewerkbare bordnaam). `/admin/content` — Content-CMS, **live** (niet langer alleen PRD): spaces, kalender, posts, asset-bibliotheek op R2, asset-requests, team — service `content.ts` + `r2.ts`, API `/api/admin/content/**`, migratie 0034. Beide synchroniseren met de persoonlijke takenlijst via `/admin/taken` + `listAssignedTasks`.
- **Prospect-import:** `scripts/` bevat AM-onboarding, ScrapeGraphAI-import en een geparametriseerde prospect-import (`--list-prefix`, `--source`); dedup via `services/contactDedup.ts`, import-mechanics in `services/prospectImport.ts`.
- **Offerte-creator** (tab op `/admin/pricing`, `services/offerte.ts` + pure `services/offerteShared.ts`, tabel `crm_offertes` migratie 0041): kiest een CRM-org, rekent met `pricingTiers` (snapshot bij aanmaken), PDF via `@react-pdf/renderer` (`components/offerte/OfferteDocument.tsx`, Lato in `public/fonts/`) op `GET /api/admin/offertes/[id]/pdf`. Offerte-tab + "Maak offerte op maat"-deeplink in de org-sidepanel. Afzender = `INVOICE_SELLER` (env, nooit verzonnen). Offerte-copy is klant-facing → TOV + Christians akkoord vóór een echte klant 'm krijgt.

## Verification

- `bun run build` + browser-check op de gewijzigde admin-page tegen live data.
