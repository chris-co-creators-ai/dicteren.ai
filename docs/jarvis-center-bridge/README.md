# Jarvis + CENTER bridge voor Dicteren.ai

## BLUF

Jarvis in Hermes Agent + het CENTER dashboard vormen de operator- en staginglaag rond Dicteren.ai. Dick/Gick bouwen in de Dicteren.ai codebase; Jarvis orkestreert, harvest, verifieert, bewaakt en reviewt vanuit Hermes/CENTER.

De commerciële waarheid staat in het live Dicteren.ai CRM. Niet in CENTER en niet in Instantly.

```text
LinkedIn / andere bronnen
  -> CENTER / Jungler staging + analyse
  -> Dicteren.ai CRM import + MCP tools
  -> Instantly outreach-uitvoering
  -> Instantly webhook terug naar Dicteren.ai CRM
  -> CRM events, signals, suppression en taken in Dicteren.ai dashboard
```

## Wat Dick/Gick altijd moeten weten

1. **Jarvis bestaat buiten deze repo.** Jarvis draait in Hermes Agent op Christians Mac-omgeving en gebruikt CENTER als dashboard/command-center.
2. **CENTER is geen productiedatabase voor Dicteren.ai.** CENTER is staging, intelligence, wiki, command center en agent-orchestratie.
3. **Dicteren.ai CRM is source of truth.** Leads, contacten, lifecycle-events, suppressions en taken horen uiteindelijk in de live Dicteren.ai CRM-tabellen.
4. **Instantly is uitvoerder.** Instantly verstuurt sequences en levert lifecycle-events terug. Instantly bepaalt niet de finale leadstatus.
5. **Suppression wint altijd.** `email_unsubscribed`, `not_interested` en `do_not_contact` blokkeren nieuwe outbound, ook als Instantly of een CSV iets anders suggereert.
6. **Handoff via bewijs.** Als Dick/Gick Jarvis iets vraagt, geef exacte paden, commit, branch, route, verificatie-output en wat nog open is.
7. **Geen secrets in docs of thread.** LinkedIn cookies, Vercel tokens, Neon URLs, Instantly secrets en browsergegevens blijven buiten repo en buiten `comms/thread.md`.
8. **Copy en outreach blijven human-in-the-loop.** Agents mogen draften, importeren, markeren en taken klaarzetten; een mens publiceert/verstuurt.

## Wie is Jarvis hier?

Jarvis is Christians Hermes-based AI partner/operator. Praktisch betekent dat:

- Jarvis draait via Hermes Agent, met eigen memory, skills, tools, browser/terminal toegang en cron/job-capabilities.
- Jarvis gebruikt CENTER als command-center: dashboard, wiki, kanban, CRM-staging, logs, presence/torus en agent-bridge.
- Jarvis is geen productpersonage in de Dicteren.ai app. Dit is interne operator-architectuur.
- Jarvis rapporteert feitelijk: geen verzonnen tool-output, geen onbewezen repo-state, geen claims zonder bron.
- Jarvis kan Dick/Gick briefen via CENTER `comms/thread.md`, en Dick/Gick kunnen Jarvis daar terugbriefen.

## Wat is CENTER?

CENTER is Christians lokale command-center op de Mac Mini.

Belangrijke feiten:

- Repo: `/Users/christianbleeker/center`
- Dashboard: `http://localhost:4000`
- Lokale DB: `/Users/christianbleeker/center/data/center.db`
- Realtime agent-thread: `/Users/christianbleeker/center/comms/thread.md`
- Bridge script: `/Users/christianbleeker/center/scripts/bridge-send`
- Jungler service voor LinkedIn-harvest: `http://127.0.0.1:8788` wanneer actief

CENTER bevat o.a. wiki, kanban, CRM-staging, torus UI, page tools, opsctl, logs en agent-communicatie. Voor Dicteren.ai is CENTER vooral de plek waar Jarvis data vindt, normaliseert, reviewt en klaarzet voordat het live CRM wordt geraakt.

## Wat hebben Jarvis + CENTER nu voor Dicteren.ai gemaakt?

### 1. LinkedIn/Jungler harvesting richting Dicteren.ai-staging

In CENTER/Jungler bestaat een flow om LinkedIn-engagement rond posts te harvesten. Belangrijk:

- Eerst harde LinkedIn-gate: `/voyager/api/me == 200`.
- Bij Voyager endpoint-drift moet Browser/SDUI fallback gebruikt worden.
- De bestaande Jungler push naar CRM schrijft historisch naar de lokale CENTER CRM-scope `scope-venture-dicteren-ai`.
- Dat is niet automatisch de live Dicteren.ai CRM. Voor live CRM moeten MCP/importtools in de Dicteren.ai webrepo gebruikt worden.

### 2. Live Dicteren.ai MCP/CRM tools uitgebreid

In `web/src/app/api/mcp/[transport]/route.ts` zijn MCP-tools toegevoegd voor agents:

- `crm_leadlist_create`
- `crm_leadlist_list`
- `crm_leads_import`
- `crm_deck_token_get`
- `crm_outreach_mark`

Doel: agents kunnen leadlijsten maken, prospects importeren, persoonlijke partnerdeck-links ophalen en suppressions zetten zonder de CRM-regels te omzeilen.

### 3. Instantly webhook bridge gebouwd

Route:

- `GET/POST /api/instantly/webhook`

Belangrijk gedrag:

- `POST` vereist header `x-instantly-secret` die overeenkomt met `INSTANTLY_WEBHOOK_SECRET` in Vercel.
- Webhook-events worden gededuped in `instantly_webhook_events`.
- Herkende events schrijven naar `crm_events`, `crm_signals` en contactvelden.
- Unsubscribe/not-interested/do-not-contact worden als harde suppressions vastgelegd.
- De keten is self-healing: half-verwerkte events (crash na de audit-insert) worden
  via de duplicate-path of de `instantly-reconcile` cron alsnog verwerkt, en
  deliveries die Instantly's eigen retry-window (3x binnen 30s) misten haalt
  diezelfde cron via de Instantly API op en replayt ze. Vereist `INSTANTLY_API_KEY`.
- Webhook-configuratie is config-as-code: `bun scripts/setup-instantly-webhook.ts`.

### 4. Database uitgebreid

Migratie:

- `web/drizzle/0055_instantly_webhooks.sql`

Voegt toe:

- tabel `instantly_webhook_events`
- lifecycle enumwaarden zoals `email_replied`, `email_unsubscribed`, `meeting_booked`, `campaign_completed`
- suppressionvelden op `crm_contacts`

### 5. Productieroute live, activatie-gate via env

De live route bestaat op:

- `https://www.dicteren.ai/api/instantly/webhook`

Interpretatie van GET:

- `configured:false` = code is live, maar Vercel mist `INSTANTLY_WEBHOOK_SECRET`.
- `configured:true` = Vercel heeft de secret; Instantly kan worden gekoppeld met dezelfde waarde in header `x-instantly-secret`.

## Waar hou je overzicht?

- **Dicteren.ai dashboard:** commercieel overzicht, CRM, leadlijsten, contacts, taken, signals, suppressions. Dit is de plek voor Christian/AM/team.
- **CENTER dashboard:** machinekamer voor Jarvis, harvesting, staging, agent-runs, wiki, logs en cross-agent overleg.
- **Instantly:** alleen outreach-uitvoering en campagne-metrics. Niet gebruiken als finale CRM-waarheid.

## Wat moet Dick doen bij toekomstig werk?

Bij elk CRM/MCP/Instantly/CENTER-raakvlak:

1. Lees deze map.
2. Check live codepaden in `implementation-map.md`.
3. Bepaal of het CENTER-staging of live Dicteren.ai CRM raakt.
4. Houd Dicteren.ai CRM als source of truth.
5. Verifieer met echte output.
6. Brief Jarvis via `communication-protocol.md` als het cross-repo, harvest, staging of operator-review raakt.
