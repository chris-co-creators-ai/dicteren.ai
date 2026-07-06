# web/ — Dicteren.ai commercieel platform

## Purpose

Het commerciële Next.js-platform achter dicteren.ai: marketing-site, Better Auth, licentie-systeem, self-service + zakelijke checkout, Mollie-betaalketen, admin-dashboard, CRM en het model-CDN. De desktop-app zelf staat in `repo/`, niet hier.

## Ownership

- Dit is de git-repo (`chris-co-creators-ai/dicteren.ai`). De project-root erboven is geen git.
- Auto-deploy: push naar `main` → Vercel → www.dicteren.ai.
- Package manager: `bun` (niet npm/yarn/pnpm).

## Local Contracts

- **Dit is NIET de Next.js die je kent.** Deze versie heeft breaking changes in API's, conventies en bestandsstructuur ten opzichte van je trainingsdata. Lees de relevante gids in `node_modules/next/dist/docs/` vóór je code schrijft. Volg deprecation-notices op.
- **Bij library/framework-werk:** Context7 MCP raadplegen, niet op geheugen vertrouwen.
- **Deploy-discipline:** elke wijziging in `src/**` of `drizzle/**` direct `git add` + commit + `git push origin main`. Conventional commits. Geen tussenvraag. Uitzonderingen waar ik wél eerst Christians go vraag: destructieve DB-migratie (DROP/TRUNCATE/UPDATE zonder WHERE), breaking API-change voor externe consumers, force-push, breaking dependency-bump, code die secrets blootlegt.
- **Build-check vóór push** als de wijziging meer dan 5 regels raakt: `bun run build`. Meet de exit-code apart (`bun run build; echo BUILD_EXIT=$?`) — een keten met `grep`/`echo` maskeert build-falen.
- **CSS:** alleen bestaande vars of directe hex. Geen verzonnen vars als `var(--orange-500)`.
- **Copy is een claim.** Elke regel user-facing tekst toetsen aan `.claude/skills/dicteren-app-truth.md` en de TOV (`.claude/docs/tone-of-voice.md`). Humanizer-skill vooraf. Geen HTML-entities (`&apos;`/`&rsquo;`) in JSX — herschrijf de zin.
- **Jarvis/CENTER/Instantly context:** bij CRM, MCP, Instantly, Jungler, CENTER-sync of agent-handoff werk eerst `docs/jarvis-center-bridge/README.md` lezen. Contract: Dicteren.ai CRM is source of truth; CENTER is staging/orchestratie; Instantly is alleen outreach-uitvoering.

## Work Guidance

- Service-layer-pattern: domeinregels in actions, herbruikbare mechanics in `src/lib/services/*`. Zie `src/lib/CLAUDE.md`.
- Integreren vóór nieuwe modules: scan bestaande page/service/component vóór je nieuw bouwt. Side-panel boven modal, tab boven sub-route.

## Verification

- `bun run build` (exit-code apart) voor compile.
- Browser-check op een live route voor UI-werk.

## Child DOX Index

- `src/app/CLAUDE.md` — App Router: routes, pages, API-handlers, server-actions.
- `src/lib/CLAUDE.md` — de niet-UI-kern: services, db/schema, config, auth.
- `src/components/CLAUDE.md` — React-componenten en de shadcn/ui-laag.
- `drizzle/CLAUDE.md` — SQL-migraties en migratie-discipline.
- `docs/CLAUDE.md` — interne projectdocumentatie, inclusief Jarvis/CENTER/Instantly bridge-context.
