# repo/ — Dicteren.ai desktop-app

This file provides guidance to AI coding assistants working with code in this repository.

## Purpose

De cross-platform desktop spraak-naar-tekst-app: Tauri 2.x met een Rust-backend en een React/TypeScript-frontend. Het commerciële web-platform staat in `../web/`, niet hier.

## Ownership

- Dit is een aparte git-repo, gedeeld met Slik. Wijzigingen hier coördineren met hem; niet zomaar pushen.
- Versie staat synchroon in `package.json`, `src-tauri/tauri.conf.json` en `src-tauri/Cargo.toml`.

## Local Contracts

- **Engine = ORT/ONNX (Parakeet), géén Whisper.** Sinds 0.8.5 is whisper volledig verwijderd: `whisper-rs`, de Whisper-modellen en de GPU-accelerator-instellingen zitten niet meer in de tree. De `transcribe-rs`-feature is `["onnx"]`. De architectuur-secties hieronder zijn historisch waar ze nog Whisper noemen; de actieve engine is `nvidia/parakeet-tdt-0.6b-v3`.
- **Dode dependency = volledig strippen, niet runtime-uitschakelen.** Whisper compileerde nog mee en kostte een libclang-crash; daarom eruit.
- **`bindings.ts` is auto-generated via tauri-specta** maar wordt bij Rust-typewijzigingen handmatig gespiegeld in de frontend. Verwijder/voeg je een command of type toe, spiegel het.
- **Voorganger-sporen** (`handy`, `blob.handy.computer`) horen niet in de tree. Rust-deps die patches nodig hebben staan onder `github.com/dicterenai/*` (tauri, vad-rs, rodio, dicteren-keys), gepind op rev.
- **Build + test-cyclus-hygiëne** (Mac, vóór Christian een DMG test): oude app + state eerst schoonvegen, verse DMG naar `~/Downloads`. NOOIT `pkill -f "dicteren-ai"` patternmatch terwijl een Rust-compile loopt — Cargo's `rustc --crate-name dicteren_ai_app_lib` matcht dat en de build krijgt SIGTERM. Gebruik `pkill -x` of een process-id, of wacht tot de compile klaar is.
- **DMG-notarisatie nooit parallel aan een lopende tauri-build** (hersigneert de DMG → staple-mismatch). Keten sequentieel: build → notarytool submit --wait → stapler staple → validate.
- **i18n verplicht:** alle user-facing strings via i18next, ESLint dwingt dit af (geen hardcoded strings in JSX).

## Development Commands

**Prerequisites:** [Rust](https://rustup.rs/) (latest stable), [Bun](https://bun.sh/).

```bash
bun install
bun run tauri dev          # dev-modus
bun run tauri build        # productie-build
bun run dev                # frontend-only (Vite)
bun run lint / lint:fix    # ESLint frontend
bun run format             # Prettier + cargo fmt — LET OP: draait over de hele repo
bun run test               # cargo test --lib (vanuit src-tauri/)
```

`bun run format` herformatteert elk bestand in de tree, niet alleen wat jij wijzigde.
Grote delen van de repo zijn niet prettier-conform, dus dit levert tientallen
ongerelateerde bestanden in je diff op. Formatteer per bestand:
`cargo fmt --manifest-path src-tauri/Cargo.toml` plus `bunx prettier --write <jouw bestanden>`.

**Model-setup (dev):**

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx https://models.dicteren.ai/silero_vad_v4.onnx
```

Voor platform-specifieke build-setup: zie `BUILD.md`.

## Architecture Overview

Tauri 2.x (Rust-backend + React/TypeScript-frontend).

### Backend (src-tauri/src/)

- `lib.rs` — entry point, Tauri-setup, manager-initialisatie
- `managers/` — kernlogica: `audio.rs`, `model.rs`, `transcription.rs`, `history.rs`
- `audio_toolkit/` — low-level audio: `audio/` (device, recording, resampling), `vad/` (Silero VAD)
- `commands/` — Tauri-command-handlers voor frontend-communicatie
- `cli.rs`, `shortcut.rs`, `settings.rs`, `overlay.rs`, `signal_handle.rs` (`send_transcription_input()`), `utils.rs`

### Frontend (src/)

- `App.tsx`, `components/` (settings, model-selector, onboarding, overlay, update-checker, shared/ui/icons/footer)
- `hooks/useSettings.ts`, `stores/settingsStore.ts` (Zustand), `bindings.ts`, `lib/types.ts`

### Key patterns

- **Manager Pattern:** Audio/Model/Transcription geïnitialiseerd bij startup, via Tauri-state.
- **Command-Event:** frontend → backend via commands; backend → frontend via events.
- **Pipeline:** Audio → VAD → ORT/Parakeet → tekst → clipboard/paste.
- **State Flow:** Zustand → Tauri-command → Rust-state → persistence (tauri-plugin-store).
- **Single Instance:** een tweede launch brengt het settings-venster naar voren; remote-control-flags sturen args naar de draaiende instance via `tauri_plugin_single_instance`.

## CLI Parameters

`cli.rs` (definities), `main.rs` (parsing), `lib.rs` (applying), `signal_handle.rs` (gedeelde logica).

| Flag | Beschrijving |
| --- | --- |
| `--toggle-transcription` | Toggle opname op een draaiende instance |
| `--toggle-post-process` | Toggle opname met nabewerking |
| `--cancel` | Annuleer de huidige operatie |
| `--start-hidden` | Start zonder hoofdvenster (tray zichtbaar) |
| `--no-tray` | Start zonder system tray |
| `--debug` | Debug-modus, verbose logging |

CLI-flags zijn runtime-only overrides; ze wijzigen geen persisted settings.

## Code Style

- **Rust:** `cargo fmt` + `cargo clippy` vóór commit, errors expliciet afhandelen (geen `unwrap` in productie), doc-comments op publieke API's.
- **TS/React:** strict TS (geen `any`), functionele componenten met hooks, Tailwind, alias `@/` → `./src/`.

## Platform Notes

- **macOS:** Metal, accessibility-permissie vereist voor sneltoetsen.
- **Windows:** code-signing (Azure Trusted Signing-traject), DirectML.
- **Linux:** beperkte Wayland-support; overlay via GTK layer shell (uit met `DICTEREN_AI_NO_GTK_LAYER_SHELL=1`).

## GitHub workflow voor AI-assistenten

**Verplicht.** Lees vóór elke PR/issue/discussion het relevante template en volg het strikt — ook de "ceremoniële" secties (checklists, AI Assistance-disclosure, Human Written Description).

- **PR:** lees `.github/PULL_REQUEST_TEMPLATE.md`. Een sectie die een mens-geschreven paragraaf vraagt: laat een TODO-placeholder staan, verzin niet hun stem.
- **Issue:** lees `.github/ISSUE_TEMPLATE/`. Blanco issues uit; feature-requests naar Discussions.
- **Feature freeze:** nieuwe features vereisen community-support in Discussions vóór een PR.
- **Commits:** conventional prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`), focus op *waarom*.

## Child DOX Index

- `src-tauri/CLAUDE.md` — de Rust-backend: managers, audio-pipeline, Tauri-commands, build-keten.
- `src/CLAUDE.md` — de React-frontend: stores, bindings, i18n, overlay.
