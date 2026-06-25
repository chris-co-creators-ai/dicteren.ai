// Dicteren.ai — Admin: presigned upload voor het logo/portret van een partner.
// Voor de AM om een afbeelding te vervangen in het brand-identity-blok. Staff-gated.
// De key valt onder partner-intake/<contactId>/ zodat de brand-identity-PATCH 'm
// accepteert. De client uploadt direct naar R2 en stuurt de key daarna in de PATCH.

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireStaffApi } from "@/lib/auth/session";
import { isR2Configured, signUpload } from "@/lib/services/r2";

type Params = Promise<{ contactId: string }>;

const ALLOWED: Record<string, string[]> = {
  logo: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  portrait: ["image/png", "image/jpeg", "image/webp"],
};
const MAX_BYTES = 5 * 1024 * 1024;

function safeName(name: string): string {
  return (
    name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(-60) ||
    "bestand"
  );
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { contactId } = await params;

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

  const key = `partner-intake/${contactId}/${kind}-${randomUUID()}-${safeName(fileName)}`;
  const url = await signUpload(key, mimeType, 600);

  return NextResponse.json({ success: true, data: { url, key } });
}
