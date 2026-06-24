/**
 * Upload desktop-app release-artifacts naar R2 (bucket dicteren-models, prefix releases/).
 * Bereikbaar als https://models.dicteren.ai/releases/<bestand>.
 * Gebruikt de S3-compatible endpoint + R2 access keys (NIET de Cloudflare API-token).
 *
 * Run:  bun run scripts/upload-release.ts <versie> <staging-dir>
 * Bijv: bun run scripts/upload-release.ts 0.8.6 /pad/naar/release-0.8.6
 *
 * Uploadt per release de drie bestanden die /download en de auto-updater nodig
 * hebben: de Mac-DMG, de Mac updater-tarball en de Windows-installer. De .sig's
 * gaan inline in latest.json, de .msi blijft als alternatief op de GitHub-release.
 */

import { config } from "dotenv";
import { createReadStream, statSync } from "node:fs";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

config({ path: ".env.local" });

const VERSION = process.argv[2];
const STAGE = process.argv[3];
if (!VERSION || !STAGE) {
  console.error("Gebruik: bun run scripts/upload-release.ts <versie> <staging-dir>");
  process.exit(1);
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID!;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET = "dicteren-models";

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  process.exit(1);
}

const files = [
  { name: `Dicteren.ai_${VERSION}_aarch64.dmg`, ct: "application/x-apple-diskimage" },
  { name: `Dicteren.ai_${VERSION}_aarch64.app.tar.gz`, ct: "application/gzip" },
  { name: `Dicteren.ai_${VERSION}_x64-setup.exe`, ct: "application/octet-stream" },
];

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

for (const f of files) {
  const src = `${STAGE}/${f.name}`;
  const key = `releases/${f.name}`;
  const size = statSync(src).size;
  console.log(`\n${f.name} (${(size / 1024 / 1024).toFixed(1)} MiB) -> r2://${BUCKET}/${key}`);

  const upload = new Upload({
    client: s3,
    params: { Bucket: BUCKET, Key: key, Body: createReadStream(src), ContentType: f.ct },
    partSize: 50 * 1024 * 1024,
    queueSize: 4,
  });
  await upload.done();
  console.log(`  done`);
}

console.log("\nKlaar. Alle release-artifacts staan op R2.");
