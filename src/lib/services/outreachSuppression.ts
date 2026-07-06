import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmContacts, crmEvents } from "@/lib/db/schema";
import type { NewCrmContact, NewCrmEvent } from "@/lib/db/schema";

export const OUTREACH_MARKS = [
  "unsubscribed",
  "not_interested",
  "do_not_contact",
] as const;

export type OutreachMark = (typeof OUTREACH_MARKS)[number];

function patchForMark(mark: OutreachMark, reason: string | null): Partial<NewCrmContact> {
  const now = new Date();
  const base: Partial<NewCrmContact> = {
    suppressionReason: reason ?? mark,
    suppressionMarkedAt: now,
    updatedAt: now,
  };
  switch (mark) {
    case "unsubscribed":
      return { ...base, emailUnsubscribed: true, doNotContact: true };
    case "not_interested":
      return { ...base, notInterested: true };
    case "do_not_contact":
      return { ...base, doNotContact: true };
  }
}

function eventKindForMark(mark: OutreachMark): NewCrmEvent["kind"] {
  return mark === "unsubscribed" ? "email_unsubscribed" : "field_updated";
}

export async function markContactOutreach(args: {
  contactId: string;
  mark: OutreachMark;
  actorUserId: string | null;
  reason?: string | null;
  source?: string;
}): Promise<{
  contactId: string;
  organizationId: string | null;
  mark: OutreachMark;
  eventId: string;
} | null> {
  const [contact] = await db
    .select({
      id: crmContacts.id,
      crmOrganizationId: crmContacts.crmOrganizationId,
      email: crmContacts.email,
      name: crmContacts.name,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, args.contactId))
    .limit(1);

  if (!contact) return null;

  await db
    .update(crmContacts)
    .set(patchForMark(args.mark, args.reason ?? null))
    .where(eq(crmContacts.id, contact.id));

  const [event] = await db
    .insert(crmEvents)
    .values({
      crmContactId: contact.id,
      crmOrganizationId: contact.crmOrganizationId,
      actorUserId: args.actorUserId,
      kind: eventKindForMark(args.mark),
      payload: {
        via: args.source ?? "mcp-agent",
        mark: args.mark,
        reason: args.reason ?? null,
        email: contact.email,
        name: contact.name,
      },
    })
    .returning({ id: crmEvents.id });

  return {
    contactId: contact.id,
    organizationId: contact.crmOrganizationId,
    mark: args.mark,
    eventId: event.id,
  };
}
