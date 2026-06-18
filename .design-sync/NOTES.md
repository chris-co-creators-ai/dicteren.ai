# design-sync — NOTES

Sync van de shadcn/ui-laag (`src/components/ui/`, 55 componenten) naar het
claude.ai/design-project `Dicteren.ai Design System`
(`b09de354-159f-46be-81f9-f84f9617c9c7`). Eerste sync: 2026-06-18.

## Repo-vorm en inputs

- `web/` is een Next.js-app, geen library: **geen `dist`, geen component-`.d.ts`**.
  De converter draait dus in synth-modus via een **barrel-entry** die alle
  `ui/*.tsx` re-exporteert (`cfg.entry` = `.design-sync/.cache/ds-entry.tsx`).
- De **55 primaire componenten** worden gepind via `cfg.componentSrcMap`; hun
  sub-delen (CardHeader, DialogContent, …) zitten wél in de bundle (via de
  barrel `export *`, 310 exports op `window.DicterenDS`) maar krijgen geen eigen
  kaart. Nieuw `ui/*.tsx` bestand? `build-inputs.sh` pakt het automatisch in de
  barrel; voeg het handmatig toe aan `componentSrcMap` om het een kaart te geven.
- **CSS**: Tailwind v4 (CSS-first, geen config-bestand). `cfg.cssEntry` is een
  statisch gecompileerde stylesheet (`.cache/dicteren-ds.css`) uit
  `ds-input.css` (= `@import` van `globals.css` + content-sources). De CLI
  `@tailwindcss/cli` staat in de `.ds-sync`-scratch, niet in de repo-deps.
- `cfg.buildCmd` = `bash .design-sync/build-inputs.sh` → regenereert barrel + CSS.
  `resync.mjs` draait dit vanzelf. Barrel en compiled-CSS staan onder
  `.cache/` (gitignored), dus dit MOET op elke (fresh-clone) re-sync draaien.

## Gotchas (kostten een debug-cyclus)

- **Previews = NAMED exports only.** `export default function` wordt niet als
  preview-cel herkend ("no exports / __dsCells empty"). Elke cel is een
  `export function <Naam>()`.
- **base-ui menu group-labels** (`DropdownMenuLabel`, `ContextMenuLabel`) moeten
  binnen een `*Group` staan, anders gooit de module ("MenuGroupContext missing").
- **Overlays** (Dialog/Sheet/Popover/menu's/Tooltip/Select/Combobox): forceer de
  open staat via `open`/`defaultOpen` (of `value`+`defaultOpen`), en zet
  `cfg.overrides.<Naam>.cardMode = "single"` zodat het portal-paneel in de kaart
  past. Tooltip/Sidebar hebben hun provider in de preview gecomposed.
- **ChartContainer (recharts)** rendert leeg in headless tenzij: vaste-pixel
  wrapper-div + expliciete `width`/`height` op de chart + `isAnimationActive={false}`.
  In een echte browser (claude.ai/design) rendert het sowieso goed.
- **Pagination** → `cardMode: column`. **Progress/Table** → zie `cfg.overrides`.
- **Playwright**: cache pint chromium 1223, npm-playwright wil 1228. Draai
  validate/capture met `DS_CHROMIUM_PATH` naar
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell`.

## Known render warns

Geen. Laatste validate: 55/55 clean, 0 bad/thin/floor.

## Re-sync risks (waar de volgende run op moet letten)

- **Fonts via remote `@import`**: Nunito Sans + JetBrains Mono laden via Google
  Fonts in `ds-input.css` ([FONT_REMOTE] is verwacht, géén missend font). De app
  zelf laadt ze via `next/font` — er is bewust geen `@font-face` om te shippen.
- **cssEntry is een statische compile van wat `web/src` gebruikt.** Een
  design-agent die Tailwind-utilities verzint die de app nergens gebruikt, krijgt
  die niet gestyled. Daarom documenteert `conventions.md` de semantische tokens,
  de kant-en-klare component-classes (`.btn-primary` etc.) en de CSS-vars — NIET
  de `bg-brand-*`-utilities (die emit Tailwind niet, want ongebruikt).
- **DirectionProvider** = context-provider zonder eigen UI (minimale demo).
  **Toaster** rendert statisch leeg (toasts zijn runtime); de kaart toont de
  Toaster-mount + een trigger-knop. Beide bewust zo.
- **Grouping**: alle 55 staan in groep `general` (flat `ui/`-map). Semantische
  groepen (Forms/Overlays/…) zouden een kleine `source-kit.mjs`-fork of
  per-component docsMap-stubs vergen — bewust niet gedaan in de eerste sync.
