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
- **De licentie wordt in de backend afgedwongen, niet in de UI.** `LicenseGate` (managed state, `managers/license.rs`) is de bron van waarheid; `transcription_coordinator::start()` is de enige plek waar transcriptie mag beginnen en checkt daar de gate. Het lock-scherm in de frontend is spiegeling, geen slot: het settings-venster is meestal verborgen (tray), dus een UI-only check houdt niemand tegen. Nieuwe transcriptie-ingangen lopen via de coordinator, nooit rechtstreeks naar `ACTION_MAP`.
- **`is_unlocked` is afgeleid, nooit rauw overgenomen.** `settle()` herberekent status + unlock tegen de klok bij elke lees. Een `expiresAt` in het verleden sluit af, ook offline en ook als de server nog `trial`/`active` zegt. Statussen die de lock al verklaren (revoked, refunded, canceled) blijven staan zodat het lock-scherm de juiste copy kiest.
- **Trials zijn consumer-licenties met een `DIC-TRIAL-`-code**; de prefix uit de getekende token is de enige discriminator (zie `web/src/lib/services/trial.ts`). Er is geen `beta`-type meer.

## Verification

- `cargo check` / `cargo clippy` schoon. Volledige build via `bun run tauri build` vanaf `repo/`.
- `cargo test --lib` groen. De expiry-regels in `managers/license.rs` zijn getest; breid die tests uit bij elke wijziging aan de gate.
