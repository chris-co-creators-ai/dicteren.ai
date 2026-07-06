# docs/ — interne projectdocumentatie

## Purpose

Duurzame technische en operationele documentatie voor het Dicteren.ai web-platform. Deze docs zijn voor AI-assistenten en het team, niet automatisch user-facing copy.

## Ownership

- Documenteer stabiele contracten, bronpaden, runbooks en verificatie-stappen.
- Geen secrets, tokens, cookies, wachtwoorden, connection strings of persoonlijke browserdata.
- Als een doc een workflow beschrijft die code, database, dashboard of externe tooling raakt, moet hij verwijzen naar de relevante bronbestanden.

## Local Contracts

- `jarvis-center-bridge/` is de contextlaag voor samenwerking tussen Dick/Gick, Jarvis, Hermes Agent, CENTER, Dicteren.ai CRM en Instantly.
- Wijzig je CRM, MCP, Instantly, Jungler, CENTER-sync of Jarvis-handoff gedrag, update `jarvis-center-bridge/` in dezelfde sessie.
- Docs mogen geen marketingclaims introduceren. Voor externe copy blijven `.claude/docs/tone-of-voice.md` en `.claude/skills/dicteren-app-truth.md` leidend.

## Work Guidance

- Schrijf voor agents die later zonder chatcontext instappen.
- Begin met de beslissing of het contract; zet achtergrond en bewijs eronder.
- Gebruik absolute lokale paden waar dat nodig is voor cross-repo context.

## Verification

- Markdown-only docs: minimaal `git diff --check`.
- Als docs bij code/DB-wijzigingen horen: draai de bestaande code-verificatie uit de dichtstbijzijnde `CLAUDE.md`.

## Child DOX Index

- `jarvis-center-bridge/CLAUDE.md` — Jarvis/Hermes/CENTER samenwerking, LinkedIn-harvest, Dicteren.ai CRM source-of-truth, Instantly lifecycle bridge en handoff-protocol.
