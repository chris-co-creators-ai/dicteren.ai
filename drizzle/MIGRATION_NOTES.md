# Migration Notes

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
