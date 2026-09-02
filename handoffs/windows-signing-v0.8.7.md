# Opdracht: gesigneerde Windows-build van Dicteren.ai v0.8.7

Je draait op Christians Windows-machine. Bouw de Windows-installer van
Dicteren.ai v0.8.7, onderteken hem met het Certum-certificaat, en upload het
resultaat naar de GitHub-release. Rapporteer daarna twee dingen terug.

Waarom lokaal en niet in CI: de release-workflow verwacht Azure Trusted
Signing-secrets die niet bestaan. Dicteren.ai tekent met een Certum-cloudcert
via SimplySign Desktop, en dat vereist een actieve lokale sessie. De CI-build
levert dus een ongesigneerde installer die je hier vervangt.

## Voorwaarden (controleer dit eerst, bouw niet zonder)

1. **SimplySign Desktop draait en is ingelogd** als `info@dicteren.ai`. Een
   sessie is ongeveer 2 uur geldig. Log opnieuw in als hij verlopen is.
2. **Het certificaat staat in `CurrentUser\My`** met thumbprint
   `11180EA9E42CD6F5242EE7DBD652EB39AF46F9B7`. Controleer met:
   ```powershell
   Get-ChildItem Cert:\CurrentUser\My | Where-Object Thumbprint -eq "11180EA9E42CD6F5242EE7DBD652EB39AF46F9B7"
   ```
   Geen resultaat betekent dat de SimplySign-sessie niet actief is. Stop en meld dat.
3. **`signtool` staat op PATH** (Windows SDK).
4. **Rust stable, Bun en de Vulkan SDK (1.4.309.0)** zijn geïnstalleerd.
5. **De updater-signeersleutel staat in je omgeving.** Dit zijn de waarden van
   de GitHub-secrets `TAURI_SIGNING_PRIVATE_KEY` en
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Vraag ze aan Christian als je ze niet hebt.
   Let op: `TAURI_SIGNING_PRIVATE_KEY` is de **inhoud** van de sleutel, niet een pad.
   Zonder deze twee krijg je geen geldige `.sig` en werkt de auto-update niet.

## Bouwen

```powershell
git clone git@github.com:chris-co-creators-ai/dicteren.ai.git dicteren-app
cd dicteren-app
git checkout v0.8.7
bun install
bun run tauri build --config src-tauri/tauri.windows-signing.conf.json
```

Heb je de repo al staan: `git fetch --tags && git checkout v0.8.7`.

Die config-override bevat alleen het `signCommand`. Tauri ondertekent dan
tijdens het bundelen en maakt de updater-`.sig` daarna over het reeds
ondertekende bestand.

**Draai nooit achteraf zelf `signtool` over de installer.** Dat ondertekent
opnieuw, waardoor de bestaande `.sig` niet meer bij het bestand hoort en de
auto-update stukgaat. De volgorde is: Tauri tekent, dan pas de `.sig`. Die
volgorde staat in de config, jij hoeft er niets aan te doen.

Hardcodeer het `signCommand` ook niet in `src-tauri/tauri.conf.json`. Dat brak
de build eerder (commit 73666ba); daarom staat het in een losse override.

## Controleren

Twee bestanden komen uit `src-tauri\target\release\bundle\nsis\`:

- `Dicteren.ai_0.8.7_x64-setup.exe`
- `Dicteren.ai_0.8.7_x64-setup.exe.sig`

Ontbreekt de `.sig`, dan stonden de updater-omgevingsvariabelen niet goed. Bouw
opnieuw, upload niets.

Controleer de handtekening:

```powershell
signtool verify /pa /v "src-tauri\target\release\bundle\nsis\Dicteren.ai_0.8.7_x64-setup.exe"
```

Je moet de Certum-keten zien met een geldig tijdstempel van `time.certum.pl`.
Faalt dit, dan is er niet ondertekend: stop en meld het, upload niets.

## Uploaden

De GitHub-release `v0.8.7` bestaat al als concept en bevat mogelijk een
ongesigneerde installer uit CI. Overschrijf die:

```powershell
gh release upload v0.8.7 `
  "src-tauri\target\release\bundle\nsis\Dicteren.ai_0.8.7_x64-setup.exe" `
  "src-tauri\target\release\bundle\nsis\Dicteren.ai_0.8.7_x64-setup.exe.sig" `
  --repo chris-co-creators-ai/dicteren.ai --clobber
```

Publiceer de release niet. Hij hoort een concept te blijven.

## Terugrapporteren

Meld deze drie dingen:

1. De uitvoer van `signtool verify` (de regels met de certificaatketen en het tijdstempel).
2. **De volledige inhoud van het `.sig`-bestand.** Dat is één regel base64. Nodig
   voor het updater-manifest:
   ```powershell
   Get-Content "src-tauri\target\release\bundle\nsis\Dicteren.ai_0.8.7_x64-setup.exe.sig"
   ```
3. De SHA-256 van de installer:
   ```powershell
   Get-FileHash "src-tauri\target\release\bundle\nsis\Dicteren.ai_0.8.7_x64-setup.exe" -Algorithm SHA256
   ```

## Buiten je opdracht

Raak de web-repo, `public/releases/latest.json` en de R2-bucket niet aan. Dat
wordt aan de Mac-kant geregeld zodra jouw `.sig` binnen is.

Wijzig geen broncode. Loopt de build stuk op iets anders dan ondertekenen, meld
dan de foutmelding en stop.
