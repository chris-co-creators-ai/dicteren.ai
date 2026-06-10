// Dicteren.ai — Admin: presigned PUT voor een org-bijlage.

import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { signOrgAttachmentUpload } from "@/lib/services/resellerFlow";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if (guard.response) return guard.response;
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
  const fileName = String(body.fileName ?? "");
  const mimeType = String(body.mimeType ?? "");
  const sizeBytes = Number(body.sizeBytes ?? 0);
  if (!fileName || !mimeType || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json(
      { success: false, error: "fileName, mimeType en sizeBytes verplicht" },
      { status: 400 },
    );
  }
  const result = await signOrgAttachmentUpload({
    orgId: id,
    fileName,
    mimeType,
    sizeBytes,
  });
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 },
    );
  }
  return NextResponse.json({
    success: true,
    data: { key: result.key, uploadUrl: result.uploadUrl },
  });
}
