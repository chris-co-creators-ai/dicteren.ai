# Implementatiekaart

## Repositories en roots

| Onderdeel | Pad / locatie |
| --- | --- |
| Dicteren.ai web Git-root | `/Users/christianbleeker/Desktop/iAPPS/apps/dicteren-ai/web` |
| GitHub | `chris-co-creators-ai/dicteren.ai`, branch `main` |
| Auto-deploy | push naar `main` -> Vercel -> `www.dicteren.ai` |
| CENTER repo | `/Users/christianbleeker/center` |
| CENTER dashboard | `http://localhost:4000` |
| CENTER bridge thread | `/Users/christianbleeker/center/comms/thread.md` |
| Desktop-app repo | `/Users/christianbleeker/Desktop/iAPPS/apps/dicteren-ai/repo` |

Let op: `/Users/christianbleeker/Desktop/iAPPS/apps/dicteren-ai` is geen Git-root. `web/` en `repo/` zijn aparte werelden.

## Dicteren.ai codepaden voor deze bridge

### API

- `src/app/api/instantly/webhook/route.ts`
  - GET health/config check.
  - POST Instantly lifecycle webhook.
  - Vereist `INSTANTLY_WEBHOOK_SECRET` in Vercel.
  - Verwacht header `x-instantly-secret` vanuit Instantly.

- `src/app/api/mcp/[transport]/route.ts`
  - MCP endpoint voor CRM-agent tools.
  - Bevat workspace-capabilities en tools voor leadlijst/import/deck/suppression.

### Services

- `src/lib/services/instantlyWebhook.ts`
  - Parse/dedupe van Instantly events.
  - Contact lookup op e-mail.
  - Mapping naar `crm_events`, `crm_signals` en suppressionvelden.

- `src/lib/services/outreachSuppression.ts`
  - Zet `unsubscribed`, `not_interested` of `do_not_contact` op contact.
  - Schrijft timeline-event.

- `src/lib/services/rateLimit.ts`
  - Bevat webhook-rate-limit bucket.

- Bestaande services die door MCP-tools gebruikt worden:
  - `src/lib/services/leadList.ts`
  - `src/lib/services/prospectImport.ts`
  - `src/lib/services/crmAssign.ts`
  - `src/lib/services/partnerFunnel.ts`
  - `src/lib/services/signals.ts`
  - `src/lib/services/crmDeals.ts`

### Database/schema

- `src/lib/db/schema/communication.ts`
  - Bevat `instantlyWebhookEvents`.

- `src/lib/db/schema/crmDeals.ts`
  - Bevat CRM event enum en contactvelden.

- `drizzle/0055_instantly_webhooks.sql`
  - Additieve migratie voor Instantly lifecycle bridge.

### Fixtures/docs

- `scripts/fixtures/instantly-webhook-lead-meeting-booked.json`
  - Voorbeeldpayload voor webhook-smoke.

- `.env.example`
  - Bevat placeholder voor `INSTANTLY_WEBHOOK_SECRET`.

## MCP tools die nu bestaan voor agents

| Tool | Doel |
| --- | --- |
| `crm_leadlist_create` | Leadlijst maken voor `eindklant` of `reseller`. |
| `crm_leadlist_list` | Leadlijsten tonen met member-counts. |
| `crm_leads_import` | Verrijkte prospects importeren in CRM + leadlijst. Vereist `assignToUserId`. |
| `crm_deck_token_get` | Persoonlijke `/partner/<token>` URL ophalen/genereren voor een contact. |
| `crm_outreach_mark` | Contact markeren als `unsubscribed`, `not_interested` of `do_not_contact`. |
| `crm_leads_list` | Bestaand: leads zoeken/filteren. |
| `crm_lead_get` | Bestaand: org/contact/activity/tasks ophalen. |
| `crm_task_create` | Bestaand: taak maken. |
| `crm_interaction_log` | Bestaand: interactie loggen. |
| `crm_disposition_set` | Bestaand: beldispositie zetten. |
| `crm_stage_set` | Bestaand: stage zetten met gates. |
| `agent_report_status` | Bestaand: agentvoortgang zichtbaar maken. |

## Instantly event mapping

De webhook service mapt o.a.:

| Instantly event | CRM-effect |
| --- | --- |
| `email_sent` | `crm_events.kind = email_sent`, touch-count omhoog. |
| `email_opened` | `crm_events.kind = email_opened`. |
| `email_link_clicked` | `crm_events.kind = email_clicked`, signal `outreach_click`. |
| `reply_received` | `crm_events.kind = email_replied`, signal `outreach_reply`. |
| `email_bounced` | `crm_events.kind = email_bounced`. |
| `lead_unsubscribed` | `email_unsubscribed = true`, `do_not_contact = true`, event `email_unsubscribed`. |
| `lead_not_interested` | `not_interested = true`, field update event. |
| `lead_meeting_booked` | `crm_events.kind = meeting_booked`, signal `outreach_meeting_booked`. |
| `lead_meeting_completed` | `crm_events.kind = meeting_completed`. |
| `lead_no_show` | `crm_events.kind = meeting_no_show`. |
| `lead_closed` | status-change event, signal `outreach_won`. |

Onbekende events worden wel gededuped/auditbaar opgeslagen, maar niet blind als CRM-status gebruikt.

## Productie-activatie

Live route:

```text
https://www.dicteren.ai/api/instantly/webhook
```

GET-resultaten:

```text
configured:false  -> route live, Vercel secret ontbreekt
configured:true   -> route live en secret is geconfigureerd
```

Nodig in Vercel:

```text
INSTANTLY_WEBHOOK_SECRET=<shared secret buiten git>
```

Nodig in Instantly webhook-config:

```text
Header: x-instantly-secret
Value: dezelfde secret als Vercel
```

## Verificatiecommando's

In `web/`:

```bash
bunx tsc --noEmit
bun run build
bunx eslint \
  'src/app/api/instantly/webhook/route.ts' \
  'src/lib/services/instantlyWebhook.ts' \
  'src/lib/services/outreachSuppression.ts' \
  'src/app/api/mcp/[transport]/route.ts' \
  'src/lib/db/schema/communication.ts' \
  'src/lib/db/schema/crmDeals.ts' \
  'src/lib/services/rateLimit.ts'
```

Globale `bun run lint` kan falen op bestaande repo-problemen buiten deze bridge. Target-lint op gewijzigde bridge-bestanden moet schoon zijn.

## Migratie-verificatie

Controleer minimaal:

- `to_regclass('public.instantly_webhook_events')` bestaat.
- `crm_contacts` heeft `email_unsubscribed`, `not_interested`, `do_not_contact`, `suppression_reason`, `suppression_marked_at`.
- `crm_event_kind` heeft de nieuwe lifecycle values.

Gebruik geen secrets in output. Print alleen booleans, kolomnamen en enumlabels.
