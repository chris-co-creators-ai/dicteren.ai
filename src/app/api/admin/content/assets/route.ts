import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/auth/session";
import { listAssets, createAsset, withDownloadUrls } from "@/lib/services/content";
import { validateAsset } from "@/lib/services/r2";

export async function GET(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const url = new URL(request.url);
  const spaceId = url.searchParams.get("space") || undefined;
  const kind = (url.searchParams.get("kind") as "image" | "video" | "document") || undefined;
  const assets = await listAssets({ spaceId, kind });
  const withUrls = await withDownloadUrls(assets);
  return NextResponse.json({ success: true, assets: withUrls });
}

// Stap 2 van de upload: registreer de metadata ná de geslaagde PUT naar R2.
export async function POST(request: Request) {
  const guard = await requireStaffApi();
  if ("response" in guard) return guard.response;
  const body = await request.json().catch(() => ({}));

  const spaceId = (body.spaceId as string | undefined)?.trim();
  const r2Key = (body.r2Key as string | undefined)?.trim();
  const fileName = (body.fileName as string | undefined)?.trim();
  const mimeType = (body.mimeType as string | undefined)?.trim();
  const sizeBytes = Number(body.sizeBytes ?? 0);
  if (!spaceId || !r2Key || !fileName || !mimeType) {
    return NextResponse.json(
      { success: false, error: "spaceId, r2Key, fileName en mimeType zijn verplicht" },
      { status: 400 },
    );
  }
  const check = validateAsset(mimeType, sizeBytes);
  if (!check.ok) {
    return NextResponse.json({ success: false, error: check.error }, { status: 400 });
  }

  const asset = await createAsset({
    spaceId,
    r2Key,
    kind: check.kind,
    fileName,
    mimeType,
    sizeBytes,
    thumbnailR2Key: (body.thumbnailR2Key as string | undefined) ?? null,
    width: body.width ? Number(body.width) : null,
    height: body.height ? Number(body.height) : null,
    durationSec: body.durationSec ? Number(body.durationSec) : null,
    label: (body.label as string | undefined) ?? null,
    tags: Array.isArray(body.tags) ? body.tags : null,
    uploadedByUserId: guard.session.user.id,
  });
  return NextResponse.json({ success: true, asset });
}
