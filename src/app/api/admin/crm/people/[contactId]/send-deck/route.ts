// Dicteren.ai — Admin: stuur het partnerdeck naar een persoon (reseller-funnel).
// Markeert "Deck verstuurd" + stuurt de deck-mail vanuit het AM-adres met de
// unieke deck-link. Hoort bij de dispositie "Partnerdeck sturen" / de cockpit-knop.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaffApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { crmContacts } from "@/lib/db/schema";
import { markDeckSent } from "@/lib/services/partnerFunnel";
import { sendPartnerDeckEmail } from "@/lib/services/email";
import { emailBase } from "@/lib/url";

type Params = Promise<{ contactId: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { contactId } = await params;

  const [contact] = await db
    .select({
      email: crmContacts.email,
      firstName: crmContacts.firstName,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!contact) {
    return NextResponse.json(
      { success: false, error: "Contact niet gevonden" },
      { status: 404 },
    );
  }
  if (!contact.email) {
    return NextResponse.json(
      { success: false, error: "Contact heeft geen e-mailadres" },
      { status: 422 },
    );
  }

  const amEmail = session.user.email;
  if (!amEmail) {
    return NextResponse.json(
      { success: false, error: "AM-account heeft geen e-mailadres" },
      { status: 422 },
    );
  }

  // Markeer + token, dan de mail vanuit het AM-adres met de deck-link.
  const { token } = await markDeckSent(contactId, session.user.id);
  const deckUrl = `${emailBase()}/partner/${token}`;

  const sent = await sendPartnerDeckEmail({
    to: contact.email,
    contactName: contact.firstName ?? null,
    amName: session.user.name || "Dicteren.ai",
    amEmail,
    deckUrl,
    contactId,
  });
  if (!sent.success) {
    return NextResponse.json(
      { success: false, error: sent.error ?? "Versturen mislukt" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, data: { deckUrl } });
}
