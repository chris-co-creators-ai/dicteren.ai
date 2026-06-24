# src-tauri/ — Rust-backend

## Purpose

De Rust-kant van de desktop-app: managers (audio, model, transcription, history), het audio_toolkit (recording + Silero VAD), Tauri-commands, sneltoetsen, settings, overlay, CLI en de build-/bundle-config.

## Ownership

- Tauri-commands zijn het contract naar de frontend. Wijzig een command-signature en de frontend `bindings.ts` moet mee.

## Local Contracts

- **Engine is ORT/ONNX (Parakeet `nvidia/parakeet-tdt-0.6b-v3`).** Whisper en alle GPU-accelerator-settings zijn verwijderd. `transcribe-rs`-feature = `["onnx"]`.
- **`cargo check` na elke verwijdering** bij een dependency-strip; types die je weghaalt handmatig uit `../src/bindings.ts` spiegelen.
- **Gepinde forks** onder `github.com/dicterenai/*` (tauri, vad-rs, rodio, dicteren-keys), op rev. Geen voorganger-namen (`handy`) in `Cargo.toml`.
- **Build-signing (updater):** `TAURI_SIGNING_PRIVATE_KEY` = de inhoud van de key, niet het pad. p12 bouwen met `/usr/bin/openssl` (LibreSSL), niet OpenSSL 3. Dit is de minisign-updater-handtekening (`.sig`), los van Authenticode.
- **Windows Authenticode (code-signing):** Certum cloud-cert via SimplySign Desktop (cert in `CurrentUser\My`, thumbprint `11180EA9E42CD6F5242EE7DBD652EB39AF46F9B7`). NIET hardcoden in `tauri.conf.json` — dat brak de build eerder (commit 73666ba). Bouwen met de override-config: `bun run tauri build --config src-tauri/tauri.windows-signing.conf.json`. Tauri signeert dan Authenticode tijdens bundling en maakt de updater-`.sig` daarna over het al-gesigneerde bestand (volgorde-valkuil: post-build signtool breekt de bestaande `.sig`). SimplySign-sessie ~2u geldig, limiet 5000 signings/maand.
- **Errors expliciet**, geen `unwrap` in productie; `cargo fmt` + `cargo clippy` vóór commit.

## Verification

- `cargo check` / `cargo clippy` schoon. Volledige build via `bun run tauri build` vanaf `repo/`.
