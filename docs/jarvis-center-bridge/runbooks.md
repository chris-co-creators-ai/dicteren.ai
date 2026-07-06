# Runbooks

## 1. Nieuwe LinkedIn-post harvesten voor Dicteren.ai

Doel: engagement-data uit LinkedIn ophalen en uiteindelijk als schone leads/contacten in live Dicteren.ai CRM krijgen.

### Stappen

1. Werk in CENTER:

```bash
cd /Users/christianbleeker/center
```

2. Verifieer LinkedIn sessie voordat je harvest:

```text
/voyager/api/me == 200
```

Als dit geen 200 is: stop. Niet forceren, niet blijven loopen op cookies.

3. Run Jungler/harvest flow.

4. Controleer of data in CENTER staging terechtkomt.

5. Dedup en normaliseer. Beslis `prospectType`:

- `eindklant`
- `reseller`

6. Push naar live Dicteren.ai CRM alleen via MCP/importtool of bestaande Dicteren.ai API/service-layer.

7. Verifieer in Dicteren.ai dashboard/MCP dat contact/organisatie/leadlijst bestaat.

### Belangrijke waarschuwing

CENTER `scope-venture-dicteren-ai` is staging. Een record daar is niet automatisch een live CRM-record op `dicteren.ai`.

## 2. Prospects importeren in live Dicteren.ai CRM

Gebruik MCP-tool:

```text
crm_leads_import
```

Verplichte velden:

- `listId`
- `prospectType`: `eindklant` of `reseller`
- `assignToUserId`
- `rows[]`

Regels:

- `listType` moet overeenkomen met `prospectType`.
- Bestaande contacten niet dupliceren.
- Verrijkte velden zonder bron in `extra` of notes markeren als onzeker.
- Suppressed contacts niet opnieuw outbounden.

## 3. Partnerdeck-link genereren voor Instantly

Gebruik MCP-tool:

```text
crm_deck_token_get
```

Input:

- `contactId`

Output:

- `deckToken`
- `deckUrl`

Gebruik `deckUrl` als Instantly custom variable. Niet zelf URL's verzinnen.

## 4. Instantly webhook activeren

### Prerequisites

- Code staat live op `www.dicteren.ai`.
- Vercel env heeft `INSTANTLY_WEBHOOK_SECRET` (en `INSTANTLY_API_KEY` voor de reconcile-cron).
- Instantly-plan is Hypergrowth of hoger (webhooks-vereiste).
- Lokale `web/.env.local` heeft `INSTANTLY_API_KEY` + `INSTANTLY_WEBHOOK_SECRET` voor het setup-script.

### Webhook aanmaken (config-as-code, voorkeursroute)

```bash
cd /Users/christianbleeker/Desktop/iAPPS/apps/dicteren-ai/web
bun scripts/setup-instantly-webhook.ts
```

Idempotent: bestaat er al een webhook op onze target-URL, dan wordt die gepatcht.
Zet `all_events` + header `x-instantly-secret`. Print nooit de secret.

### Check route

```bash
python3 - <<'PY'
import json, urllib.request, urllib.error
url='https://www.dicteren.ai/api/instantly/webhook'
try:
    with urllib.request.urlopen(url, timeout=20) as r:
        print(json.dumps({'status': r.status, 'body': r.read(500).decode('utf-8', 'replace')}))
except urllib.error.HTTPError as e:
    print(json.dumps({'status': e.code, 'body': e.read(500).decode('utf-8', 'replace')}))
PY
```

Interpretatie:

- `configured:false`: Vercel secret ontbreekt.
- `configured:true`: klaar voor Instantly webhook.

### Smoke met echte secret

Doe alleen met secret uit lokale/veilige omgeving. Print de secret nooit.

Payload fixture:

```text
scripts/fixtures/instantly-webhook-lead-meeting-booked.json
```

Verwachte uitkomst:

- Nieuwe rij in `instantly_webhook_events` of `duplicate` bij herhaling.
- Bekende lead-email -> CRM-event/signals waar van toepassing.
- Onbekende lead-email -> auditrij met `skippedReason = unknown_lead_email`.

## 5. Suppression verwerken

Gebruik MCP-tool:

```text
crm_outreach_mark
```

Marks:

- `unsubscribed`
- `not_interested`
- `do_not_contact`

Regel: suppression is finaler dan campagne-intentie. Als een contact suppressed is, mag hij niet opnieuw naar Instantly totdat een mens dat expliciet en traceerbaar corrigeert.

## 6. Verificatie na wijziging

Voor code/DB/API wijzigingen in deze bridge:

```bash
cd /Users/christianbleeker/Desktop/iAPPS/apps/dicteren-ai/web
bunx tsc --noEmit
bun run build
git diff --check
```

Target-lint voor bridgebestanden:

```bash
bunx eslint \
  'src/app/api/instantly/webhook/route.ts' \
  'src/app/api/cron/instantly-reconcile/route.ts' \
  'src/lib/services/instantlyWebhook.ts' \
  'src/lib/services/outreachSuppression.ts' \
  'src/app/api/mcp/[transport]/route.ts' \
  'src/lib/db/schema/communication.ts' \
  'src/lib/db/schema/crmDeals.ts' \
  'src/lib/services/rateLimit.ts'
```

## 7. Wanneer stoppen en Christian vragen

Stop bij:

- Destructieve migratie of mass update.
- Onheldere source-of-truth keuze.
- Auth/cookie problemen rond LinkedIn.
- Copy/publicatie/outreach verzending.
- Secrets/config die niet veilig beschikbaar zijn.
- Een productie-write waarvan scope of rollback niet helder is.
