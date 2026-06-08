# src/ — React-frontend

## Purpose

De UI van de desktop-app: onboarding, settings, model-selector, de opname-overlay en de update-checker. State via Zustand, communicatie met de Rust-backend via Tauri-commands.

## Ownership

- `bindings.ts` weerspiegelt de Rust-commands en -types (tauri-specta). Het is het contract met `../src-tauri/`.

## Local Contracts

- **`bindings.ts` handmatig spiegelen** bij elke Rust-type- of command-wijziging. Een mismatch compileert wel maar faalt in runtime.
- **i18n verplicht:** geen hardcoded strings in JSX. Nieuwe tekst → key in `src/i18n/locales/en/translation.json`, dan `t('key.path')`. ESLint dwingt dit af.
- **Strict TS** (geen `any`), functionele componenten met hooks, Tailwind, alias `@/` → `./src/`.
- **Klant-facing teksten** volgen dezelfde model-naamgeving als de web-copy: "Dicteren.ai V3", geen modelnaam in de UI.
- `stores/settingsStore.ts` is de bron voor settings-state; verwijderde settings-velden laat `serde` aan de Rust-kant vallen, dus geen migratie nodig.
