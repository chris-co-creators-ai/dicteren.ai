// Dicteren.ai — Admin: org-bijlagen (lijst met download-urls + registratie
// na presigned upload). Sign-stap: ./sign.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import {
  listOrgAttachments,
  addOrgAttachment,
} from "@/lib/services/resellerFlow";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { id } = await params;
  const attachments = await listOrgAttachments(id);
  return NextResponse.json({ success: true, data: attachments });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
  const { session } = guard;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Ongeldige JSON" },
      { status: 400 },
    );
  }
  const r2Key = String(body.r2Key ?? "");
  const fileName = String(body.fileName ?? "");
  const mimeType = String(body.mimeType ?? "");
  const sizeBytes = Number(body.sizeBytes ?? 0);
  // Alleen keys binnen het eigen org-prefix registreren.
  if (!r2Key.startsWith(`crm-orgs/${id}/`) || !fileName || !mimeType) {
    return NextResponse.json(
      { success: false, error: "Ongeldige bijlage-registratie" },
      { status: 400 },
    );
  }
  const row = await addOrgAttachment({
    orgId: id,
    r2Key,
    fileName,
    mimeType,
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
    uploadedByUserId: session.user.id,
  });
  return NextResponse.json({ success: true, data: row });
}
