# SLIK-OPDRACHT — Windows-build v0.8.4 (2026-06-06)

Van: Dick (Mac-CTO). Lees eerst `SLIK.md` (repo-root) en `AGENTS.md`. Dit document is je volledige opdracht voor deze sessie. Voer uit in volgorde, sla niks over, en eindig met het rapport-bericht onderaan.

## Context (wat er al staat)

- De Mac-kant is KLAAR: 0.8.4 is gesigneerd, door Apple genotariseerd en als artifact geüpload naar de draft-release `v0.8.4` op GitHub.
- Jouw taak: de Windows-build van exact dezelfde codebase (branch `desktop-app`, HEAD bevat de tray-NL + modelnaam-fixes van vannacht), en de artifacts naar dezelfde draft-release.
- Windows-codesigning (Azure Trusted Signing) bestaat nog NIET. Je bouwt dus ongesigneerd; SmartScreen-waarschuwing is bekend en geaccepteerd voor deze fase. Sla alle Azure/signtool-stappen over.

## Stap 0 — Checks vóór je begint

1. Je zit op branch `desktop-app` en `git pull` is gedaan (deze file bestaat = je bent goed).
2. Toolchain aanwezig: `rustc --version` (stable), `bun --version`, Visual Studio Build Tools met C++ workload. Ontbreekt iets: zie `BUILD.md`, installeer eerst.
3. De updater-key staat lokaal (via USB van Christian, NIET uit git):
   - `%USERPROFILE%\.tauri\dicteren-updater.key`
   - `%USERPROFILE%\.tauri\updater-key-password.txt`
   Ontbreken die: STOP en vraag Christian. Zonder key geen updater-handtekening.
4. VAD-model ophalen (verplicht, zie AGENTS.md):
   ```powershell
   mkdir src-tauri\resources\models -Force
   curl.exe -o src-tauri\resources\models\silero_vad_v4.onnx https://models.dicteren.ai/silero_vad_v4.onnx
   ```
5. `gh auth status` — niet ingelogd? Laat Christian `gh auth login` doorlopen (browser-flow).

## Stap 1 — Build

```powershell
bun install
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\dicteren-updater.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = Get-Content "$env:USERPROFILE\.tauri\updater-key-password.txt" -Raw
bun run tauri build
```

Verwachte artifacts in `src-tauri\target\release\bundle\`:
- `nsis\Dicteren.ai_0.8.4_x64-setup.exe` (+ `.sig`)
- eventueel `msi\Dicteren.ai_0.8.4_x64_en-US.msi` (+ `.sig`)

Faalt de build: root-cause zoeken (geen symptoom-fixes), fix committen met conventional commit, opnieuw bouwen. Bekende valkuil van de Mac-kant: de key moet als INHOUD in `TAURI_SIGNING_PRIVATE_KEY`, niet als pad.

## Stap 2 — Verifieer op de laptop (met Christian)

1. Draai de setup.exe. SmartScreen-melding = verwacht ("Meer informatie" → "Toch uitvoeren").
2. App start, onboarding verschijnt, activeer met Christians licentiecode (hij heeft 'm).
3. Check: tray-menu is NEDERLANDS en toont "Dicteren.ai V3" (NIET "Parakeet"). Zie je toch Parakeet of Engels: je zit op een oude commit, pull en rebuild.
4. Dicteer-test: ctrl+spatie ingedrukt, praten, loslaten, tekst verschijnt. Christian beoordeelt.
5. Noteer Windows-versie van de laptop (winver) voor het rapport.

## Stap 3 — Upload artifacts naar de draft-release

```powershell
cd src-tauri\target\release\bundle
Get-FileHash nsis\Dicteren.ai_0.8.4_x64-setup.exe -Algorithm SHA256
gh release upload v0.8.4 nsis\Dicteren.ai_0.8.4_x64-setup.exe nsis\Dicteren.ai_0.8.4_x64-setup.exe.sig -R chris-co-creators-ai/dicteren.ai --clobber
```

(MSI ook geüpload als hij gebouwd is, zelfde commando-patroon.)

## Stap 4 — Push en rapporteer

1. Code-wijzigingen (alleen fixes, GEEN artifacts, GEEN gitignore-wijzigingen, GEEN version-bumps): commit + push naar `desktop-app`.
2. Schrijf `handoffs/slik-2026-06-06-windows-build-report.md` met wat je deed, wat afweek, en wat de volgende Slik-sessie moet weten. Commit + push.
3. Geef Christian onderstaand bericht, ingevuld, om aan Dick te geven.

## Regels die hard gelden

- Blijf van de Mac-specifieke bestanden af (`bundle_dmg`, macOS-config in tauri.conf.json).
- De updater-key NOOIT committen, loggen of in een bericht plakken.
- Geen force-push. Geen rebase op gedeelde branches.
- Subagent/AI-output is een claim: elke build-conclusie onderbouwen met exit-codes en bestandslijsten.

## Rapport-template (kopieer, vul in, geef aan Christian)

```
SLIK → DICK | windows-build v0.8.4
status: GELUKT / MISLUKT
build-exit: <code>
artifacts naar draft v0.8.4: <bestandsnamen + SHA256 van de setup.exe>
test op laptop (Windows <versie>): installer <ok/niet> · activatie <ok/niet> · dicteren <ok/niet> · tray NL + "Dicteren.ai V3" <ok/niet>
code-commits gepusht: <hashes + onderwerp, of "geen">
afwijkingen/problemen: <kort, of "geen">
rapport-handoff: handoffs/slik-2026-06-06-windows-build-report.md gepusht <ja/nee>
```
