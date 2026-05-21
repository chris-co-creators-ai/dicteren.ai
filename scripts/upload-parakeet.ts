/**
 * Mirror parakeet-v3-int8.tar.gz to R2 bucket dicteren-models.
 * Uses S3-compatible endpoint + R2 access keys (NOT the Cloudflare API token).
 *
 * Run:  bun run scripts/upload-parakeet.ts
 */

import { config } from "dotenv";
import { createReadStream, statSync } from "node:fs";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

config({ path: ".env.local" });

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID!;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET = "dicteren-models";
const KEY = "parakeet-v3-int8.tar.gz";
const SRC = "/tmp/parakeet-v3-int8.tar.gz";

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  process.exit(1);
}

const size = statSync(SRC).size;
console.log(`Source: ${SRC} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
console.log(`Target: r2://${BUCKET}/${KEY}`);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

const upload = new Upload({
  client: s3,
  params: {
    Bucket: BUCKET,
    Key: KEY,
    Body: createReadStream(SRC),
    ContentType: "application/x-gzip",
  },
  partSize: 50 * 1024 * 1024, // 50 MiB parts
  queueSize: 4, // parallel parts
});

let lastPercent = 0;
upload.on("httpUploadProgress", (p) => {
  if (!p.loaded || !p.total) return;
  const pct = Math.floor((p.loaded / p.total) * 100);
  if (pct >= lastPercent + 5 || pct === 100) {
    lastPercent = pct;
    console.log(`  ${pct}% (${(p.loaded / 1024 / 1024).toFixed(0)}/${(p.total / 1024 / 1024).toFixed(0)} MiB)`);
  }
});

const t0 = Date.now();
try {
  await upload.done();
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} catch (e) {
  console.error("Upload failed:", e);
  process.exit(1);
}
