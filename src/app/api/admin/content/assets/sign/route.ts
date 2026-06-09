import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireStaffApi } from "@/lib/auth/session";
import { signUpload, buildAssetKey, validateAsset, isR2Configured } from "@/lib/services/r2";

// Stap 1 van de upload: server tekent een presigned PUT-URL. De client uploadt
// daarna direct naar R2 en registreert de metadata via POST /assets.
export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  if (!isR2Configured()) {
    return NextResponse.json(
      { success: false, error: "R2-storage niet geconfigureerd op de server" },
      { status: 503 },
    );
  }
  const body = await request.json().catch(() => ({}));
  const spaceId = (body.spaceId as string | undefined)?.trim();
  const fileName = (body.fileName as string | undefined)?.trim();
  const mimeType = (body.mimeType as string | undefined)?.trim();
  const sizeBytes = Number(body.sizeBytes ?? 0);
  if (!spaceId || !fileName || !mimeType) {
    return NextResponse.json(
      { success: false, error: "spaceId, fileName en mimeType zijn verplicht" },
      { status: 400 },
    );
  }
  const check = validateAsset(mimeType, sizeBytes);
  if (!check.ok) {
    return NextResponse.json({ success: false, error: check.error }, { status: 400 });
  }

  const r2Key = buildAssetKey(spaceId, randomUUID(), fileName);
  const uploadUrl = await signUpload(r2Key, mimeType);
  return NextResponse.json({ success: true, uploadUrl, r2Key, kind: check.kind });
}
