import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { signTaskAttachmentUpload } from "@/lib/services/kanban";
import { isR2Configured } from "@/lib/services/r2";

type Params = Promise<{ id: string }>;

// Stap 1 van de upload: server tekent een presigned PUT-URL. De client uploadt
// daarna direct naar R2 en registreert de metadata via POST /attachments.
export async function POST(request: Request, { params }: { params: Params }) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  if (!isR2Configured()) {
    return NextResponse.json(
      { success: false, error: "R2-storage niet geconfigureerd op de server" },
      { status: 503 },
    );
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const fileName = (body.fileName as string | undefined)?.trim();
  const mimeType = (body.mimeType as string | undefined)?.trim();
  const sizeBytes = Number(body.sizeBytes ?? 0);
  if (!fileName || !mimeType) {
    return NextResponse.json(
      { success: false, error: "fileName en mimeType zijn verplicht" },
      { status: 400 },
    );
  }
  const result = await signTaskAttachmentUpload(id, fileName, mimeType, sizeBytes);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, uploadUrl: result.uploadUrl, r2Key: result.r2Key });
}
