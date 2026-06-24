// Dicteren.ai — Publiek: presigned upload voor de partner-aanmelding (logo +
// portretfoto). De niet-ingelogde prospect vraagt een presigned PUT-URL en uploadt
// het bestand direct naar R2 (geen server-doorvoer). Streng omdat dit publiek is:
// rate-limit, geldige deck-token, MIME-allowlist per soort, max 5MB, en een
// intake-key die aan de contact-id is gebonden. De key komt terug in de aanmelding
// (apply); de AM beoordeelt vóór publiceren.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { enforceRateLimit } from "@/lib/services/rateLimit";
import { getContactByDeckToken } from "@/lib/services/partnerFunnel";
import { isR2Configured, signUpload } from "@/lib/services/r2";

type Params = Promise<{ token: string }>;

// Per soort de toegestane types. Portret = foto (geen SVG); logo mag vector zijn.
const ALLOWED: Record<string, string[]> = {
  logo: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  portrait: ["image/png", "image/jpeg", "image/webp"],
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function safeName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(-60) || "bestand"
  );
}

export async function POST(request: Request, { params }: { params: Params }) {
  const blocked = await enforceRateLimit(request, "partner:logo-sign");
  if (blocked) return blocked;
  const { token } = await params;

  if (!isR2Configured()) {
    return NextResponse.json(
      { success: false, error: "Uploaden is nu niet beschikbaar" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige aanvraag" },
      { status: 400 },
    );
  }

  const kind = typeof body.kind === "string" ? body.kind : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "bestand";
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : -1;

  const allowed = ALLOWED[kind];
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Onbekend type upload" },
      { status: 400 },
    );
  }
  if (!allowed.includes(mimeType)) {
    return NextResponse.json(
      { success: false, error: "Bestandstype niet toegestaan" },
      { status: 415 },
    );
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Bestand te groot (max 5MB)" },
      { status: 413 },
    );
  }

  const contact = await getContactByDeckToken(token);
  if (!contact) {
    return NextResponse.json(
      { success: false, error: "Pagina niet gevonden" },
      { status: 404 },
    );
  }

  // Token-gebonden intake-key. De prospect kan alleen onder de eigen contact-id
  // schrijven; de apply-route accepteert later alleen keys met dit prefix.
  const key = `partner-intake/${contact.id}/${kind}-${randomUUID()}-${safeName(fileName)}`;
  const url = await signUpload(key, mimeType, 600);

  return NextResponse.json({ success: true, data: { url, key } });
}
