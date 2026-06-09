import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listTaskAttachments, addTaskAttachment } from "@/lib/services/kanban";
import { validateAsset } from "@/lib/services/r2";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const attachments = await listTaskAttachments(id);
  return NextResponse.json({ success: true, attachments });
}

// Stap 2 van de upload: registreer de metadata ná de geslaagde PUT naar R2.
export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const r2Key = (body.r2Key as string | undefined)?.trim();
  const fileName = (body.fileName as string | undefined)?.trim();
  const mimeType = (body.mimeType as string | undefined)?.trim();
  const sizeBytes = Number(body.sizeBytes ?? 0);
  if (!r2Key || !fileName || !mimeType) {
    return NextResponse.json(
      { success: false, error: "r2Key, fileName en mimeType zijn verplicht" },
      { status: 400 },
    );
  }
  const check = validateAsset(mimeType, sizeBytes);
  if (!check.ok) {
    return NextResponse.json({ success: false, error: check.error }, { status: 400 });
  }

  const attachment = await addTaskAttachment({
    taskId: id,
    r2Key,
    fileName,
    mimeType,
    sizeBytes,
    width: body.width ? Number(body.width) : null,
    height: body.height ? Number(body.height) : null,
    uploadedByUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, attachment });
}
