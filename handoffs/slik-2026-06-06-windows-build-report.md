# SLIK-RAPPORT — Windows-build v0.8.5 (2026-06-06)

Van: Slik (Windows-CTO). Opdracht: `handoffs/slik-2026-06-06-windows-build.md`, onderweg bijgesteld door Christian: v0.8.5 i.p.v. v0.8.4 (whisper volledig gestript in `5fd748d`, ook uit de Mac-versie).

## Resultaat

**GELUKT.** Build exit 0, alle artifacts geüpload naar draft-release `v0.8.5`, installer getest op de laptop met Christian — alles ok.

| Artifact | Grootte | |
|---|---|---|
| `Dicteren.ai_0.8.5_x64-setup.exe` | 17.324.756 B | SHA256 `A76F230F0FE1A123E02B18FD86B2A6FF22482D85563B792785194FDCDD025545` |
| `Dicteren.ai_0.8.5_x64-setup.exe.sig` | 424 B | updater-handtekening |
| `Dicteren.ai_0.8.5_x64_en-US.msi` | 32.538.624 B | |
| `Dicteren.ai_0.8.5_x64_en-US.msi.sig` | 424 B | updater-handtekening |

Test op Windows 11 Home (build 26200): SmartScreen-melding verscheen zoals verwacht → installer ok → onboarding + activatie ok → tray-menu Nederlands met "Dicteren.ai V3" ok → dicteer-test (ctrl+spatie) ok.

## Wat er onderweg gefixt moest worden (drie blokkades, in volgorde)

1. **libclang ontbrak** (bindgen-dependency van whisper-rs-sys). Verdween vanzelf door de whisper-strip (`5fd748d`) — geen LLVM nodig op Windows-buildmachines zolang whisper weg blijft.
2. **Linken faalde: 39 unresolved STL-symbolen uit ort-sys.** Prebuilt ONNX Runtime is gebouwd met VS2022; de machine had alleen Build Tools 2019. Fix: VS 2022 Build Tools 17.14 (C++ workload) geïnstalleerd naast 2019. **Windows-buildmachines hebben dus VS2022 Build Tools nodig, 2019 is niet genoeg.**
3. **Bundle-stap faalde: `failed to bundle project 'program not found'`.** Root cause: `tauri.conf.json` bevatte onder `bundle.windows` een `signCommand` voor Azure Trusted Signing (`trusted-signing-cli`), terwijl die tooling/credentials nog niet bestaan — de handoff zegt expliciet: ongesigneerd bouwen. Fix gecommit en gepusht als `73666ba` (raakt alleen het windows-blok, Mac-build onaangetast). **Actie voor later: zodra Azure Trusted Signing is opgezet, de signCommand terugplaatsen als CI-config-override, niet hardcoded in tauri.conf.json.**

## Code-commits gepusht naar `desktop-app`

- `73666ba` — fix(build): verwijder Azure signCommand - Trusted Signing bestaat nog niet

## Voor de volgende Slik-sessie

- Toolchain op deze laptop is nu compleet: rustc stable, bun 1.3.14, VS Build Tools 2019 + 2022, gh ingelogd. Rust-cache staat warm in `src-tauri\target\release`.
- `core.autocrlf input` staat in de repo-config — voorkomt CRLF-ruis in diffs (Cargo.toml gaf eerder een hele-bestand-line-endings-diff).
- Updater-keys staan in `%USERPROFILE%\.tauri\`. De pakket-map op de Desktop en de USB-stick kunnen weg (Christian beslist).
- `dicteren-keys` komt via de eigen GitHub-mirror op SHA-pin; Cargo regelt dit zelf, geen actie.
- **Let op voor Dick:** in draft-release `v0.8.5` staan alleen de 4 Windows-artifacts; Mac-artifacts (0.8.5, whisper-vrij) ontbreken daar nog op het moment van schrijven.
