# Migration Notes

## 0018 — Prospect-flow naar crm_contacts (2026-05-28)

Background: tot deze datum schreef `/api/admin/prospects` rijen direct in
`auth.user` (zonder login-functie, zonder email-validatie). Resultaat: één
ghost-rij `marijke visschedijk` met email zonder `@` en `role IS NULL`,
zichtbaar in `/admin/users` tussen echte gebruikers.

**Wat deze migratie doet:**
1. Maakt `crm_organizations`-rij "Onbekende organisatie" (`source='lead_form'`).
2. Verhuist alle ghost-rijen (`email NOT LIKE '%@%'` of `role IS NULL` zonder
   ooit een sessie) naar `crm_contacts` onder die placeholder-org. Bij missend
   `@`-teken krijgt het contact een synthetisch email-adres
   (`naam@onbekend.local`) en de originele waarde in `notes`.
3. Verwijdert `customer_attributes` + `auth.user` rijen.
4. Voegt `CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')` toe op `auth.user`
   zodat dit nooit meer kan.

**Uitgevoerd op:** 2026-05-28. Verhuisd: 1 rij (Marijke).

**Service-laag:** `lib/services/prospect.ts` herschreven om voortaan altijd
`crm_contacts` + `crm_organizations` te raken, NOOIT `auth.user`. Plus
EMAIL_RE-validatie aan de gate in `/api/admin/prospects`.

---

## 0011 — Per-seat zakelijke licenties (2026-05-27)

Schema-changes voor de shift van pool-model naar per-seat:

- `licenses.invitation_id` + `assigned_at` + `seat_label` (nullable)
- `license_status` enum: + `unassigned`, `pending_payment`
- `email_category` enum: + 10× `org_*` waarden
- `subscriptions.mollie_interval_changed_at`
- Nieuwe tabellen: `org_subscription_history`, `org_seat_warnings`,
  `invite_reminders_sent`

### Pool→per-seat data-migratie

**Niet uitgevoerd** — productie had 0 team-licenses met `seats > 1` op het
moment van rollout (`SELECT COUNT(*) FILTER (WHERE seats > 1) FROM licenses
WHERE type = 'team'` = 0).

Mocht er later een legacy pool-license opduiken (bv. uit een staging-import):
script in tien stappen:

```sql
-- 1. Lookup de pool-row
SELECT id, organization_id, seats, user_id, plan_id, expires_at
FROM licenses
WHERE type = 'team' AND seats > 1;

-- 2. Voor elke pool-row, voor i in 2..N:
--    INSERT licenses (..., seats=1, status='unassigned', user_id=NULL, ...)
--    code = generateLicenseCode('team')
-- 3. UPDATE de oude row: seats=1, user_id=ownerUserId, status='active'
-- 4. Per bestaande activation per user: assign de juiste nieuwe license-row
--    aan die user (zet userId, status='active')
-- 5. Verstuur een notify-mail naar elke member: "Je code is bijgewerkt"
```

Zie `services/orgSeats.ts::createUnassignedSeats` voor de programmatic versie.
