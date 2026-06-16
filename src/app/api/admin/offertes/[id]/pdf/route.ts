// Dicteren.ai — Offerte-PDF render-route
//
// Genereert de PDF on-demand uit de DB-snapshot (line_items + totalen staan vast
// bij aanmaken), zodat een download altijd exact gelijk is. Geen R2-opslag nodig:
// de snapshot is al immutable. ?template= overschrijft het sjabloon (voor de
// preview/vergelijking); ?download=1 forceert een download i.p.v. inline.

import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireScopedAm } from "@/lib/auth/session";
import { assembleOfferteForPdf } from "@/lib/services/offerte";
import {
  OfferteDocument,
  registerOfferteFonts,
  type OfferteDocProps,
} from "@/components/offerte/OfferteDocument";
import type { OfferteDocData } from "@/lib/services/offerteShared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "klant"
  );
}

export async function GET(request: Request, { params }: { params: Params }) {
  const guard = await requireScopedAm();
  if (guard.response) return guard.response;

  const { id } = await params;
  const assembled = await assembleOfferteForPdf(id);
  if (!assembled) {
    return Response.json(
      { success: false, error: "Offerte niet gevonden" },
      { status: 404 },
    );
  }

  const { offerte, seller, buyer, lineItems } = assembled;
  const url = new URL(request.url);

  const templateOverride = url.searchParams.get("template");
  const templateKey = (
    templateOverride === "minimalist" ||
    templateOverride === "klassiek" ||
    templateOverride === "merk"
      ? templateOverride
      : offerte.templateKey
  ) as OfferteDocProps["templateKey"];

  const data: OfferteDocData = {
    quoteNumber: offerte.quoteNumber,
    status: offerte.status,
    createdAt:
      offerte.createdAt instanceof Date
        ? offerte.createdAt.toISOString()
        : String(offerte.createdAt),
    validUntil: offerte.validUntil ?? null,
    period: offerte.period,
    introText: offerte.introText ?? "",
    closingText: offerte.closingText ?? "",
    notes: offerte.notes ?? null,
    lineItems,
    netCents: offerte.netCents,
    vatCents: offerte.vatCents,
    grossCents: offerte.grossCents,
    seller,
    buyer,
  };

  const origin = url.origin;
  registerOfferteFonts(
    `${origin}/fonts/Lato-Regular.ttf`,
    `${origin}/fonts/Lato-Bold.ttf`,
  );
  const element = createElement(OfferteDocument, {
    data,
    templateKey,
    logoSrc: `${origin}/branding/logo-horizontal.png`,
    iconSrc: `${origin}/branding/logo-icon-sm.png`,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const fileName = `Offerte-${offerte.quoteNumber}-${slug(buyer.name)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
