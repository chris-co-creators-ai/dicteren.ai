// Dicteren.ai — Admin: de aangeleverde brand identity van een partner bekijken +
// finetunen vóór publiceren. GET levert de velden + signed image-URL's (logo/portret
// staan als niet-publieke R2-key op de contact). PATCH werkt de tekst/kleur bij; die
// data wordt bij publiceren naar de affiliate gekopieerd, dus finetune-vóór-publish.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireStaffApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { crmContacts } from "@/lib/db/schema";
import { signDownload } from "@/lib/services/r2";

type Params = Promise<{ contactId: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { contactId } = await params;

  const [c] = await db
    .select({
      companyName: crmContacts.companyName,
      brandColor: crmContacts.appliedBrandColor,
      quote: crmContacts.appliedQuote,
      quoteAuthor: crmContacts.appliedQuoteAuthor,
      introText: crmContacts.appliedIntroText,
      logoKey: crmContacts.appliedLogoR2Key,
      portraitKey: crmContacts.appliedPortraitR2Key,
    })
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!c) {
    return NextResponse.json(
      { success: false, error: "Contact niet gevonden" },
      { status: 404 },
    );
  }

  const sign = async (key: string | null): Promise<string | null> => {
    if (!key) return null;
    try {
      return await signDownload(key, 3600);
    } catch {
      return null;
    }
  };

  return NextResponse.json({
    success: true,
    data: {
      companyName: c.companyName,
      brandColor: c.brandColor,
      quote: c.quote,
      quoteAuthor: c.quoteAuthor,
      introText: c.introText,
      logoUrl: await sign(c.logoKey),
      portraitUrl: await sign(c.portraitKey),
    },
  });
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { contactId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige aanvraag" },
      { status: 400 },
    );
  }

  // Partial update: alleen de meegestuurde velden, zodat per-veld-opslaan de rest
  // niet wist. Upload-keys moeten onder de eigen contact-id vallen.
  const ownPrefix = `partner-intake/${contactId}/`;
  const ownKey = (v: unknown): string | null => {
    const k = clean(v, 300);
    return k && k.startsWith(ownPrefix) ? k : null;
  };
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if ("companyName" in body) patch.companyName = clean(body.companyName, 200) ?? undefined;
  if ("brandColor" in body) {
    const c = clean(body.brandColor, 7);
    patch.appliedBrandColor = c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : null;
  }
  if ("quote" in body) patch.appliedQuote = clean(body.quote, 600);
  if ("quoteAuthor" in body) patch.appliedQuoteAuthor = clean(body.quoteAuthor, 120);
  if ("introText" in body) patch.appliedIntroText = clean(body.introText, 1200);
  if ("logoR2Key" in body) patch.appliedLogoR2Key = ownKey(body.logoR2Key);
  if ("portraitR2Key" in body) patch.appliedPortraitR2Key = ownKey(body.portraitR2Key);

  await db.update(crmContacts).set(patch).where(eq(crmContacts.id, contactId));

  return NextResponse.json({ success: true });
}
