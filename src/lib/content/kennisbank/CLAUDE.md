# src/lib/content/kennisbank/ — kennisbank-content

## Purpose

De bron-content voor de kennisbank. De kennisbank is de single source of truth voor alle documentatie; de FAQ leest hieruit, en de ingelogde variant staat op `/account/hulp`.

## Ownership

- Eén artikel = één bron. Wijzig hier, niet op de pagina's die het tonen.

## Local Contracts

- **Externe communicatie:** content hier is user-facing, dus TOV- en factcheck-gebonden (zie `src/app/(marketing)/CLAUDE.md`).
- **Geen dubbele waarheid:** FAQ en `/account/hulp` renderen deze content; ze krijgen geen eigen losse teksten.
