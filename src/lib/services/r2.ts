import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 via de S3-API. De app tekent presigned URL's zodat de client
// grote video's direct naar R2 uploadt (geen server-doorvoer) en assets nooit
// publiek staan zonder access-check. Zie .claude/prds/content-cms/spec.md §5.

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_CONTENT_BUCKET ?? "dicteren-content";

function missingEnv(): string | null {
  if (!ACCOUNT_ID) return "CLOUDFLARE_ACCOUNT_ID";
  if (!ACCESS_KEY_ID) return "R2_ACCESS_KEY_ID";
  if (!SECRET_ACCESS_KEY) return "R2_SECRET_ACCESS_KEY";
  return null;
}

let client: S3Client | null = null;
function r2(): S3Client {
  const missing = missingEnv();
  if (missing) throw new Error(`R2 niet geconfigureerd: ${missing} ontbreekt`);
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID!,
        secretAccessKey: SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function isR2Configured(): boolean {
  return missingEnv() === null;
}

// Presigned PUT — client uploadt het bestand direct naar deze URL. Kort
// geldig. De content-type wordt vastgezet zodat de client niet kan afwijken.
export async function signUpload(
  key: string,
  mimeType: string,
  expiresInSec = 600,
): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType }),
    { expiresIn: expiresInSec },
  );
}

// Presigned GET — voor het tonen/downloaden van een asset met access-check.
export async function signDownload(
  key: string,
  expiresInSec = 3600,
): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSec },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

function safeName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "bestand";
}

// Bouwt een stabiele, botsing-vrije R2-key voor een content-asset.
export function buildAssetKey(
  spaceId: string,
  assetId: string,
  fileName: string,
): string {
  return `content/${spaceId}/${assetId}/${safeName(fileName)}`;
}

// Idem voor een bijlage bij een Kanban-taak (prefix tasks/).
export function buildTaskAttachmentKey(
  taskId: string,
  attachmentId: string,
  fileName: string,
): string {
  return `tasks/${taskId}/${attachmentId}/${safeName(fileName)}`;
}

// ── Validatie (server-side, bij metadata-registratie) ──────────────────────
// Limieten bevestigd door Christian: beeld 25MB, video 500MB, doc 25MB.

export const CONTENT_ASSET_LIMITS = {
  image: {
    maxBytes: 25 * 1024 * 1024,
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  video: {
    maxBytes: 500 * 1024 * 1024,
    mimes: ["video/mp4", "video/quicktime", "video/webm"],
  },
  document: {
    maxBytes: 25 * 1024 * 1024,
    mimes: ["application/pdf"],
  },
} as const;

export type ContentAssetKind = keyof typeof CONTENT_ASSET_LIMITS;

// Leidt het asset-kind af uit een mime-type (of null als niet toegestaan).
export function kindForMime(mimeType: string): ContentAssetKind | null {
  for (const kind of Object.keys(CONTENT_ASSET_LIMITS) as ContentAssetKind[]) {
    if ((CONTENT_ASSET_LIMITS[kind].mimes as readonly string[]).includes(mimeType)) {
      return kind;
    }
  }
  return null;
}

// Valideert mime + grootte. Geeft {ok} of {ok:false, error} terug.
export function validateAsset(
  mimeType: string,
  sizeBytes: number,
): { ok: true; kind: ContentAssetKind } | { ok: false; error: string } {
  const kind = kindForMime(mimeType);
  if (!kind) {
    return { ok: false, error: `Bestandstype ${mimeType} niet toegestaan` };
  }
  const limit = CONTENT_ASSET_LIMITS[kind];
  if (sizeBytes > limit.maxBytes) {
    const mb = Math.round(limit.maxBytes / (1024 * 1024));
    return { ok: false, error: `Bestand te groot (max ${mb}MB voor ${kind})` };
  }
  return { ok: true, kind };
}
