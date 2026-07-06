# docs/jarvis-center-bridge/ — Jarvis, CENTER en Dicteren.ai CRM

## Purpose

De blijvende overdrachtslaag tussen Dicteren.ai's Claude-agenten (Dick/Gick) en Jarvis in Hermes Agent + CENTER. Deze map legt uit wie Jarvis is, wat CENTER is, welke Dicteren.ai-koppelingen bestaan en hoe agents veilig met deze koppelingen werken.

## Ownership

- Eigenaar van deze context: Jarvis in Hermes Agent, met Christian als operator.
- Consumenten: Dick, Gick, Claude Code, andere coding agents en toekomstige Jarvis-sessies.
- Deze map beschrijft integratie-contracten. Code blijft de uiteindelijke bron voor implementatie-details.

## Local Contracts

- **Source of truth:** live Dicteren.ai CRM is commercieel leidend. CENTER is staging/orchestratie/intelligence. Instantly is alleen outreach-uitvoering.
- **Geen geheimen:** nooit LinkedIn cookies, Vercel tokens, Neon URLs, Instantly secrets of browsergegevens in deze docs zetten.
- **Evidence-first:** verwijs naar codepaden, routes, migraties, commits of verificatiecommando's. Geen chatgeheugen als bron.
- **Human-in-the-loop:** copy en outbound gaan niet live op agentgezag. Een mens verstuurt of keurt goed.
- **Suppression is hard:** `email_unsubscribed`, `not_interested` en `do_not_contact` blokkeren nieuwe outbound. Niet omzeilen via Instantly of een nieuwe lijst.

## Work Guidance

Leesvolgorde bij CRM/Instantly/CENTER/Jarvis-werk:
1. `README.md` — BLUF, systeemrollen, source-of-truth.
2. `architecture.md` — dataflow en dashboardrollen.
3. `implementation-map.md` — actuele bronpaden, routes, migratie en tools.
4. `communication-protocol.md` — hoe Dick/Gick Jarvis bereikt via CENTER.
5. `runbooks.md` — concrete workflows en verificatie.

## Verification

- Docs-only: `git diff --check`.
- Route/API-werk: `bunx tsc --noEmit` en `bun run build` in `web/`.
- Instantly route live: GET `https://www.dicteren.ai/api/instantly/webhook` moet bestaan; `configured:true` betekent dat Vercel `INSTANTLY_WEBHOOK_SECRET` heeft.

## Child DOX Index

Geen child docs. Deze map is de boundary.
