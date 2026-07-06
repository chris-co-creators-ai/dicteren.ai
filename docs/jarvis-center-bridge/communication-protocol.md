# Communicatieprotocol: Dick/Gick <-> Jarvis

## BLUF

Dick/Gick communiceren met Jarvis via CENTER's bridge. Gebruik `bridge-send`, niet losse aannames in een lokale notitie. Geef altijd bewijs en exacte paden mee.

## Kanaal

CENTER thread:

```text
/Users/christianbleeker/center/comms/thread.md
```

Bridge script:

```bash
/Users/christianbleeker/center/scripts/bridge-send <claude|jarvis|chris> "message"
```

Voor Dick/Gick is de afzender `claude`:

```bash
cd /Users/christianbleeker/center
scripts/bridge-send claude "[#dicteren] Korte boodschap voor Jarvis"
```

Voor langere berichten: gebruik stdin, zodat shell quoting geen backticks of haakjes uitvoert.

```bash
cat >/tmp/dick-to-jarvis.md <<'EOF'
[#dicteren] Handoff voor Jarvis

Context:
- Repo: /Users/christianbleeker/Desktop/iAPPS/apps/dicteren-ai/web
- Branch/commit: main @ <sha>
- Wat is aangepast: ...
- Wat is geverifieerd: ...
- Wat moet Jarvis doen: ...
EOF

/Users/christianbleeker/center/scripts/bridge-send claude < /tmp/dick-to-jarvis.md
```

## Wanneer Dick/Gick Jarvis moeten briefen

Brief Jarvis bij:

- CRM/MCP-tools die door Jarvis of andere agents gebruikt worden.
- CENTER <-> Dicteren.ai sync of staging.
- LinkedIn/Jungler harvests.
- Instantly webhook/campaign lifecycle werk.
- Wijzigingen aan source-of-truth regels.
- Productie-DB migraties of activatiegates.
- Een bug die in CENTER/Jarvis-operatie zichtbaar moet worden.

Niet nodig voor puur lokale UI/copy wijzigingen zonder CRM, MCP, CENTER of Instantly impact.

## Wat moet in een goede handoff staan?

Gebruik dit format:

```text
[#dicteren] <titel>

Door: Dick of Gick
Repo: /Users/christianbleeker/Desktop/iAPPS/apps/dicteren-ai/web
Branch/commit: <branch> @ <sha>
Scope: <CRM / MCP / Instantly / CENTER / docs / ...>

Gedaan:
- ...

Bronpaden:
- src/...
- drizzle/...
- docs/...

Verificatie:
- command -> exit/result
- live route -> status/body zonder secrets

Open:
- ...

Vraag aan Jarvis:
- review / sync / harvest / verify / update CENTER / etc.
```

## Hoe Jarvis terugpraat

Jarvis schrijft meestal terug als `jarvis` in dezelfde thread. Dick/Gick moeten `comms/thread.md` lezen of door Christian/Jarvis gebrieft worden. Als Dick/Gick zelf in de CENTER repo werkt, kan hij de thread tailen.

```bash
cd /Users/christianbleeker/center
python3 - <<'PY'
from pathlib import Path
p = Path('comms/thread.md')
print('\n'.join(p.read_text().splitlines()[-120:]))
PY
```

## Grenzen

- Zet nooit secrets in `bridge-send` berichten.
- Zeg niet "Christian vroeg" tenzij Christian dat echt vroeg.
- Vraag Jarvis niet om LinkedIn auth te forceren. De gate blijft `/voyager/api/me == 200`.
- Vraag Jarvis niet om copy/outreach live te zetten zonder menselijke akkoordregel.
- Als je Jarvis een productie-write vraagt, benoem exact de scope en de rollback/verify-stap.

## Snelle vraagtypen

### Review

```text
[#dicteren] Jarvis, review deze CRM/MCP wijziging.
Repo: ...
Commit: ...
Controleer vooral: source-of-truth, suppression, route security, build-output.
```

### Sync CENTER naar Dicteren.ai

```text
[#dicteren] Jarvis, ik heb live CRM-importtools klaarstaan.
Gebruik CENTER alleen als staging. Push naar live CRM uitsluitend via MCP/importtool.
Hier zijn listId/prospectType/assignToUserId: ...
```

### Instantly activatie

```text
[#dicteren] Jarvis, webhook route is live.
GET /api/instantly/webhook geeft configured:true/false.
Nog nodig: Vercel secret / Instantly header / smoke.
```
