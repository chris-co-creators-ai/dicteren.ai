# src/components/ — React-componenten

## Purpose

De UI-laag: marketing-secties, account, admin, auth, checkout, help, kennisbank, analytics, cookie-consent, plus de gedeelde `shared/`- en `ui/`-componenten.

## Ownership

- `ui/` is de shadcn/ui-laag (alle 55 componenten, gebrande `globals.css`). Voeg componenten toe via de shadcn-CLI; pas de gebrande tokens aan, niet ad-hoc kleuren.

## Local Contracts

- **Geen inline `db.select()` in een component of user-page.** Data komt via de service-layer (`src/lib/services/*`); een component krijgt props of roept een server-action.
- **CSS:** alleen bestaande vars of directe hex, geen verzonnen `var(--orange-500)`.
- **Copy in componenten** die de gebruiker ziet is externe communicatie: TOV + factcheck, geen HTML-entities in JSX.
- **`shared/logo.tsx`** levert `Logo` (`logo-horizontal.png`) en `LogoIcon` (`logo-icon.png`). De assets staan in `public/branding/`.
