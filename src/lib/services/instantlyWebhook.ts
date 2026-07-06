import "server-only";
import { createHash } from "crypto";
import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  crmContacts,
  crmEvents,
  instantlyWebhookEvents,
} from "@/lib/db/schema";
import type { NewCrmContact, NewCrmEvent } from "@/lib/db/schema";
import { recordSignal } from "@/lib/services/signals";

type JsonRecord = Record<string, unknown>;

type EventMapping = {
  crmEventKind: NewCrmEvent["kind"] | null;
  signal?: { kind: string; score: number };
  touch?: boolean;
  lastContact?: boolean;
  emailUnsubscribed?: boolean;
  notInterested?: boolean;
  doNotContact?: boolean;
  skippedReason?: string;
};

export type InstantlyWebhookProcessResult = {
  received: true;
  eventType: string;
  webhookEventId?: string;
  contactId?: string;
  organizationId?: string | null;
  crmEventId?: string;
  signalId?: string;
  skipped?: string;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function valueAt(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    const rec = asRecord(cur);
    if (!rec) return undefined;
    cur = rec[key];
  }
  return cur;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickDate(...values: unknown[]): Date {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const parsed = new Date(value > 1_000_000_000_000 ? value : value * 1000);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date();
}

function eventTimeFromPayload(payload: unknown): Date {
  return pickDate(
    valueAt(payload, ["timestamp"]),
    valueAt(payload, ["created_at"]),
    valueAt(payload, ["createdAt"]),
    valueAt(payload, ["data", "timestamp"]),
    valueAt(payload, ["data", "created_at"]),
    valueAt(payload, ["data", "createdAt"]),
  );
}

function minuteBucket(date: Date): Date {
  const bucket = new Date(date);
  bucket.setSeconds(0, 0);
  return bucket;
}

function extractEnvelope(payload: unknown, rawBody: string) {
  const eventType =
    pickString(
      valueAt(payload, ["event_type"]),
      valueAt(payload, ["eventType"]),
      valueAt(payload, ["type"]),
      valueAt(payload, ["event"]),
      valueAt(payload, ["data", "event_type"]),
      valueAt(payload, ["data", "eventType"]),
    ) ?? "unknown";

  const leadEmail = pickString(
    valueAt(payload, ["lead_email"]),
    valueAt(payload, ["leadEmail"]),
    valueAt(payload, ["email"]),
    valueAt(payload, ["lead", "email"]),
    valueAt(payload, ["data", "lead", "email"]),
    valueAt(payload, ["data", "email"]),
  )?.toLowerCase() ?? null;

  const campaignId = pickString(
    valueAt(payload, ["campaign_id"]),
    valueAt(payload, ["campaignId"]),
    valueAt(payload, ["campaign", "id"]),
    valueAt(payload, ["data", "campaign_id"]),
    valueAt(payload, ["data", "campaignId"]),
    valueAt(payload, ["data", "campaign", "id"]),
  );

  const eventTime = eventTimeFromPayload(payload);

  const bucket = minuteBucket(eventTime);
  const bodyHash = createHash("sha256").update(rawBody).digest("hex").slice(0, 16);
  const dedupeLeadPart = leadEmail ?? bodyHash;
  const dedupeKey = [eventType, dedupeLeadPart, campaignId ?? "none", bucket.toISOString()].join(":");

  return { eventType, leadEmail, campaignId, eventTime, bucket, dedupeKey };
}

function mappingFor(eventType: string): EventMapping {
  switch (eventType) {
    case "email_sent":
      return { crmEventKind: "email_sent", touch: true, lastContact: true };
    case "email_opened":
      return { crmEventKind: "email_opened" };
    // Instantly's subscription-enum zegt "email_link_clicked", de afgeleverde
    // payload documenteert "link_clicked". Beide accepteren.
    case "email_link_clicked":
    case "link_clicked":
      return {
        crmEventKind: "email_clicked",
        signal: { kind: "outreach_click", score: 40 },
      };
    case "reply_received":
      return {
        crmEventKind: "email_replied",
        lastContact: true,
        signal: { kind: "outreach_reply", score: 70 },
      };
    case "auto_reply_received":
    case "lead_out_of_office":
      return { crmEventKind: "email_replied", lastContact: true };
    case "email_bounced":
      return { crmEventKind: "email_bounced", lastContact: true };
    case "lead_unsubscribed":
      return {
        crmEventKind: "email_unsubscribed",
        lastContact: true,
        emailUnsubscribed: true,
        doNotContact: true,
      };
    case "lead_interested":
      return {
        crmEventKind: "field_updated",
        signal: { kind: "outreach_interested", score: 85 },
      };
    case "lead_meeting_booked":
      return {
        crmEventKind: "meeting_booked",
        signal: { kind: "outreach_meeting_booked", score: 95 },
      };
    case "lead_meeting_completed":
      return { crmEventKind: "meeting_completed" };
    case "lead_no_show":
      return { crmEventKind: "meeting_no_show" };
    case "lead_closed":
      return {
        crmEventKind: "status_changed",
        signal: { kind: "outreach_won", score: 90 },
      };
    case "lead_not_interested":
      return {
        crmEventKind: "field_updated",
        notInterested: true,
      };
    case "lead_wrong_person":
      return {
        crmEventKind: "field_updated",
        signal: { kind: "outreach_wrong_person", score: 75 },
      };
    case "campaign_completed":
      return { crmEventKind: "campaign_completed" };
    case "account_error":
      return { crmEventKind: null, skippedReason: "account_error_without_contact_scope" };
    default:
      return { crmEventKind: null, skippedReason: "unsupported_event" };
  }
}

async function findContactByEmail(email: string) {
  const [contact] = await db
    .select({
      id: crmContacts.id,
      crmOrganizationId: crmContacts.crmOrganizationId,
      email: crmContacts.email,
      name: crmContacts.name,
    })
    .from(crmContacts)
    .where(sql`lower(${crmContacts.email}) = ${email}`)
    .limit(1);
  return contact ?? null;
}

function contactPatchFor(mapping: EventMapping, eventTime: Date): Partial<NewCrmContact> {
  const patch: Partial<NewCrmContact> = { updatedAt: new Date() };
  if (mapping.lastContact) {
    patch.lastContactAt = eventTime;
    patch.lastChannel = "email";
  }
  if (mapping.emailUnsubscribed) {
    patch.emailUnsubscribed = true;
    patch.doNotContact = true;
    patch.suppressionReason = "instantly:lead_unsubscribed";
    patch.suppressionMarkedAt = eventTime;
  }
  if (mapping.notInterested) {
    patch.notInterested = true;
    patch.suppressionReason = "instantly:lead_not_interested";
    patch.suppressionMarkedAt = eventTime;
  }
  if (mapping.doNotContact) {
    patch.doNotContact = true;
  }
  return patch;
}

type StoredWebhookRow = {
  id: string;
  eventType: string;
  leadEmail: string | null;
  campaignId: string | null;
  payload: unknown;
};

/** Verwerk een al opgeslagen audit-rij tot CRM-effecten. Gedeeld door de
 *  live webhook-flow, de duplicate-self-heal en de reprocess-cron. */
async function processStoredWebhookEvent(
  row: StoredWebhookRow,
  eventTime: Date,
): Promise<InstantlyWebhookProcessResult> {
  const mapping = mappingFor(row.eventType);
  const payloadRecord = asRecord(row.payload) ?? { raw: row.payload };

  if (!row.leadEmail) {
    await db
      .update(instantlyWebhookEvents)
      .set({ skippedReason: "no_lead_email", processedAt: new Date() })
      .where(eq(instantlyWebhookEvents.id, row.id));
    return {
      received: true,
      eventType: row.eventType,
      webhookEventId: row.id,
      skipped: "no_lead_email",
    };
  }

  const contact = await findContactByEmail(row.leadEmail);
  if (!contact) {
    await db
      .update(instantlyWebhookEvents)
      .set({ skippedReason: "unknown_lead_email", processedAt: new Date() })
      .where(eq(instantlyWebhookEvents.id, row.id));
    return {
      received: true,
      eventType: row.eventType,
      webhookEventId: row.id,
      skipped: "unknown_lead_email",
    };
  }

  let crmEventId: string | null = null;
  if (mapping.crmEventKind) {
    const [event] = await db
      .insert(crmEvents)
      .values({
        crmContactId: contact.id,
        crmOrganizationId: contact.crmOrganizationId,
        actorUserId: null,
        kind: mapping.crmEventKind,
        payload: {
          via: "instantly",
          eventType: row.eventType,
          leadEmail: row.leadEmail,
          campaignId: row.campaignId,
          eventTime: eventTime.toISOString(),
          payload: payloadRecord,
        },
      })
      .returning({ id: crmEvents.id });
    crmEventId = event.id;
  }

  const patch = contactPatchFor(mapping, eventTime);
  await db.update(crmContacts).set(patch).where(eq(crmContacts.id, contact.id));
  if (mapping.touch) {
    await db
      .update(crmContacts)
      .set({
        touchCount: sql`${crmContacts.touchCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(crmContacts.id, contact.id));
  }

  let signalId: string | null = null;
  let skippedReason = mapping.skippedReason ?? null;
  if (mapping.signal) {
    if (contact.crmOrganizationId) {
      signalId = await recordSignal({
        contactId: contact.id,
        organizationId: contact.crmOrganizationId,
        kind: mapping.signal.kind,
        score: mapping.signal.score,
        payload: {
          via: "instantly",
          eventType: row.eventType,
          campaignId: row.campaignId,
          leadEmail: row.leadEmail,
          webhookEventId: row.id,
        },
      });
    } else {
      skippedReason = "missing_organization_for_signal";
    }
  }

  await db
    .update(instantlyWebhookEvents)
    .set({
      crmContactId: contact.id,
      crmOrganizationId: contact.crmOrganizationId,
      crmEventId,
      signalId,
      skippedReason,
      processedAt: new Date(),
    })
    .where(eq(instantlyWebhookEvents.id, row.id));

  return {
    received: true,
    eventType: row.eventType,
    webhookEventId: row.id,
    contactId: contact.id,
    organizationId: contact.crmOrganizationId,
    ...(crmEventId ? { crmEventId } : {}),
    ...(signalId ? { signalId } : {}),
    ...(skippedReason ? { skipped: skippedReason } : {}),
  };
}

export async function processInstantlyWebhookPayload(
  payload: unknown,
  rawBody: string,
): Promise<InstantlyWebhookProcessResult> {
  const payloadRecord = asRecord(payload) ?? { raw: payload };
  const envelope = extractEnvelope(payloadRecord, rawBody);

  const [inserted] = await db
    .insert(instantlyWebhookEvents)
    .values({
      dedupeKey: envelope.dedupeKey,
      eventType: envelope.eventType,
      leadEmail: envelope.leadEmail,
      campaignId: envelope.campaignId,
      timestampBucket: envelope.bucket,
      payload: payloadRecord,
    })
    .onConflictDoNothing({ target: instantlyWebhookEvents.dedupeKey })
    .returning({ id: instantlyWebhookEvents.id });

  if (!inserted) {
    // Zelf-heal: een eerdere delivery kan gecrasht zijn ná de audit-insert
    // maar vóór verwerking (geen transactions op neon-http). De 60s-guard
    // voorkomt dat we een nog lopende verwerking dubbel uitvoeren.
    const [existing] = await db
      .select({
        id: instantlyWebhookEvents.id,
        eventType: instantlyWebhookEvents.eventType,
        leadEmail: instantlyWebhookEvents.leadEmail,
        campaignId: instantlyWebhookEvents.campaignId,
        payload: instantlyWebhookEvents.payload,
        processedAt: instantlyWebhookEvents.processedAt,
        receivedAt: instantlyWebhookEvents.receivedAt,
      })
      .from(instantlyWebhookEvents)
      .where(eq(instantlyWebhookEvents.dedupeKey, envelope.dedupeKey))
      .limit(1);
    if (
      existing &&
      !existing.processedAt &&
      existing.receivedAt.getTime() < Date.now() - 60_000
    ) {
      return processStoredWebhookEvent(existing, envelope.eventTime);
    }
    return { received: true, eventType: envelope.eventType, skipped: "duplicate" };
  }

  return processStoredWebhookEvent(
    {
      id: inserted.id,
      eventType: envelope.eventType,
      leadEmail: envelope.leadEmail,
      campaignId: envelope.campaignId,
      payload: payloadRecord,
    },
    envelope.eventTime,
  );
}

/** Vangnet 1 (cron): audit-rijen die na een crash op processed_at NULL bleven
 *  hangen alsnog verwerken. Kan een zeldzaam dubbel timeline-event opleveren
 *  als de eerste poging al een crm_event schreef; nooit een dubbele status. */
export async function reprocessStuckInstantlyEvents(opts?: {
  olderThanMinutes?: number;
  limit?: number;
}): Promise<{ reprocessed: number }> {
  const olderThan = new Date(Date.now() - (opts?.olderThanMinutes ?? 5) * 60_000);
  const stuck = await db
    .select({
      id: instantlyWebhookEvents.id,
      eventType: instantlyWebhookEvents.eventType,
      leadEmail: instantlyWebhookEvents.leadEmail,
      campaignId: instantlyWebhookEvents.campaignId,
      payload: instantlyWebhookEvents.payload,
    })
    .from(instantlyWebhookEvents)
    .where(
      and(
        isNull(instantlyWebhookEvents.processedAt),
        lt(instantlyWebhookEvents.receivedAt, olderThan),
      ),
    )
    .orderBy(asc(instantlyWebhookEvents.receivedAt))
    .limit(opts?.limit ?? 25);

  for (const row of stuck) {
    await processStoredWebhookEvent(row, eventTimeFromPayload(row.payload));
  }
  return { reprocessed: stuck.length };
}

const INSTANTLY_API_BASE = "https://api.instantly.ai/api/v2";

export type InstantlyReconcileResult =
  | { configured: false }
  | { configured: true; checked: number; replayed: number; duplicates: number };

/** Vangnet 2 (cron): Instantly retryt failed deliveries maar 3x binnen 30s.
 *  Alles wat daarbuiten valt halen we via hun webhook-events-API op en spelen
 *  we opnieuw af door de normale flow; de dedupe-key maakt dit idempotent. */
export async function reconcileInstantlyWebhookEvents(opts?: {
  lookbackHours?: number;
  maxEvents?: number;
}): Promise<InstantlyReconcileResult> {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return { configured: false };

  const from = new Date(
    Date.now() - (opts?.lookbackHours ?? 6) * 3_600_000,
  ).toISOString();
  const maxEvents = opts?.maxEvents ?? 200;

  let checked = 0;
  let replayed = 0;
  let duplicates = 0;
  let startingAfter: string | null = null;

  while (checked < maxEvents) {
    const params = new URLSearchParams({ limit: "100", success: "false", from });
    if (startingAfter) params.set("starting_after", startingAfter);
    const res = await fetch(`${INSTANTLY_API_BASE}/webhook-events?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Instantly webhook-events API gaf ${res.status}`);
    }
    const body = (await res.json()) as {
      items?: unknown[];
      next_starting_after?: string;
    };
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) break;

    for (const item of items) {
      if (checked >= maxEvents) break;
      const rec = asRecord(item);
      if (!rec) continue;
      checked++;
      // Alleen deliveries voor ónze route; een workspace kan meer webhooks hebben.
      const url = typeof rec.webhook_url === "string" ? rec.webhook_url : "";
      if (!url.includes("/api/instantly/webhook")) continue;
      const eventPayload = asRecord(rec.payload);
      if (!eventPayload) continue;
      const result = await processInstantlyWebhookPayload(
        eventPayload,
        JSON.stringify(eventPayload),
      );
      if (result.skipped === "duplicate") duplicates++;
      else replayed++;
    }

    if (!body.next_starting_after) break;
    startingAfter = body.next_starting_after;
  }

  return { configured: true, checked, replayed, duplicates };
}
