# src-tauri/ — Rust-backend

## Purpose

De Rust-kant van de desktop-app: managers (audio, model, transcription, history), het audio_toolkit (recording + Silero VAD), Tauri-commands, sneltoetsen, settings, overlay, CLI en de build-/bundle-config.

## Ownership

- Tauri-commands zijn het contract naar de frontend. Wijzig een command-signature en de frontend `bindings.ts` moet mee.

## Local Contracts

- **Engine is ORT/ONNX (Parakeet `nvidia/parakeet-tdt-0.6b-v3`).** Whisper en alle GPU-accelerator-settings zijn verwijderd. `transcribe-rs`-feature = `["onnx"]`.
- **`cargo check` na elke verwijdering** bij een dependency-strip; types die je weghaalt handmatig uit `../src/bindings.ts` spiegelen.
- **Gepinde forks** onder `github.com/dicterenai/*` (tauri, vad-rs, rodio, dicteren-keys), op rev. Geen voorganger-namen (`handy`) in `Cargo.toml`.
- **Build-signing:** `TAURI_SIGNING_PRIVATE_KEY` = de inhoud van de key, niet het pad. p12 bouwen met `/usr/bin/openssl` (LibreSSL), niet OpenSSL 3.
- **Errors expliciet**, geen `unwrap` in productie; `cargo fmt` + `cargo clippy` vóór commit.

## Verification

- `cargo check` / `cargo clippy` schoon. Volledige build via `bun run tauri build` vanaf `repo/`.
