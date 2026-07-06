# Architectuur: CENTER, Dicteren.ai CRM en Instantly

## Systeemrollen

| Systeem | Rol | Waarheid? | Dashboard voor |
| --- | --- | --- | --- |
| CENTER | Staging, intelligence, Jarvis-operatie, harvest, wiki, kanban, logs | Nee, behalve eigen staging/operatie | Jarvis/Chris machinekamer |
| Dicteren.ai web | Commercieel platform, admin, CRM, MCP, API, checkout, partnerfunnel | Ja, voor CRM en GTM | Team/AM/Christian |
| Instantly | Outreach-sequences, mailuitvoering, campagne-events | Nee | Campagne-uitvoering |
| LinkedIn | Brondata voor engagement en prospects | Nee | Inputbron |
| Hermes Agent | Jarvis runtime: tools, memory, skills, cron, browser/terminal | Nee, operatorlaag | Jarvis |

## Source-of-truth regel

Voor GTM en CRM geldt:

```text
Dicteren.ai CRM > CENTER staging > Instantly > CSV/source scrape
```

Praktisch:

- Een contact dat in Dicteren.ai CRM `do_not_contact` heeft, mag niet opnieuw naar Instantly.
- Een Instantly reply is een event, geen finale status totdat Dicteren.ai CRM hem verwerkt.
- Een CENTER-harvest is kandidaatdata totdat hij via import/MCP in het live CRM staat.
- Een CSV/import mag bestaande CRM-contacten niet overschrijven zonder expliciet contract.

## Dataflow: LinkedIn naar CRM naar outreach

```text
1. LinkedIn post/comment/reaction data
   - bron: LinkedIn UI/Voyager/browser sessie
   - operator: Jungler in CENTER
   - gate: /voyager/api/me == 200

2. CENTER staging
   - ruwe records
   - analyse/dedup/verrijking
   - tijdelijke lokale CRM-scope waar nodig

3. Dicteren.ai live CRM import
   - via MCP/API/service-layer
   - schrijft contact, organisatie, leadlijst, eigenaar, prospectType
   - source of truth begint hier

4. Instantly sequence
   - gebruikt alleen contacts die outbound mogen ontvangen
   - partnerdeck-url kan uit `crm_deck_token_get` komen

5. Instantly webhook terug
   - `/api/instantly/webhook`
   - dedupe in `instantly_webhook_events`
   - schrijft `crm_events`, `crm_signals`, suppressionvelden

6. Dicteren.ai dashboard
   - team ziet taken, signals, leadstatus, suppression
```

## Dashboardverdeling

### CENTER dashboard

Gebruik CENTER voor:

- Jarvis-operatie en status.
- Harvest-runs en ruwe LinkedIn-data.
- Wiki/kennis/kanban rond ventures.
- Cross-agent communicatie via `comms/thread.md`.
- Debugging van Jungler, browser-auth en staging.

Niet gebruiken als definitieve CRM-weergave voor het team.

### Dicteren.ai dashboard

Gebruik Dicteren.ai voor:

- Live leads/contacten/organisaties.
- Leadlijsten voor eindklanten en resellers.
- Account-owner toewijzing.
- Timeline-events.
- Signals.
- Suppression status.
- Taken en AM-opvolging.
- Partnerdeck-links en resellerfunnel.

Dit is de plek waar Christian en het team overzicht houden.

### Instantly

Gebruik Instantly voor:

- Sequence setup.
- Delivery.
- Campaign-level metrics.
- Mailbox/outreach operationele details.

Niet gebruiken als CRM-waarheid. Als Instantly iets leert, moet het via webhook/MCP terug naar Dicteren.ai CRM.

## Belangrijke grenzen

### LinkedIn-auth

Jarvis mag LinkedIn niet forceren of loopen als `/voyager/api/me` geen 200 is. Auth moet uit een actieve browser-sessie komen en stabiel zijn. Bij endpoint drift: Browser/SDUI fallback gebruiken, niet cookies blijven proberen.

### Productie-CRM

Elke write naar live Dicteren.ai CRM moet via bestaande service-layer, MCP-tool of route gaan. Geen ad-hoc SQL tegen productie behalve expliciete migraties/verificatie met duidelijke scope.

### Outbound

Geen enkele agent verstuurt zelfstandig commerciële mail/copy. Agents mogen:

- prospects importeren;
- suppressions vastleggen;
- taken aanmaken;
- draftteksten maken;
- signals verwerken.

Een mens keurt verzending/publicatie goed.
