# src/app/api/mollie/ — betaal-webhook

## Purpose

De Mollie-webhook (`webhook/route.ts`): vangt payment- en subscription-status-events, verifieert ze tegen de Mollie-API en triggert fulfillment (licentie aanmaken/activeren, mails, audit).

## Ownership

- `.claude/skills/mollie-integration.md` is leidend voor parameters, statuses en webhook-regels. Eerst de skill, dan pas Context7 (`/websites/mollie`) voor onbeschreven gevallen.

## Local Contracts

- **Nooit vertrouwen op de webhook-body.** Een webhook geeft alleen een id; haal de echte status op via de Mollie-API met de server-key.
- **Webhook = geen rate-limit** (Mollie is een trusted caller), wel signature/herkomst-verificatie zoals de skill voorschrijft.
- **Metadata** via `buildMollieMetadata` (standaard-schema), geen native Mollie-tags. Partners staan niet in Mollie. "X maanden gratis" via subscription `startDate`-shift.
- **Idempotent fulfillment:** dezelfde betaling kan meerdere webhook-calls geven. Fulfill één keer.
- **Wijzig je `mollie.ts`, `api/mollie/*` of `api/checkout/*`:** werk de Mollie-skill in dezelfde sessie bij.
