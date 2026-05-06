import { driveHasFilenames } from "../lib/gdrive";
import { getFirestore } from "../lib/firebaseAdmin";
import { listAllProducts } from "../lib/store/catalog";

function extractFilenameFromImageUrl(url: string) {
  const prefix = "/api/assets/images/";
  const idx = url.indexOf(prefix);
  if (idx === -1) return null;
  const rest = url.slice(idx + prefix.length);
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

async function runOnce() {
  const products = await listAllProducts({ limit: 100000 });
  const filenames = Array.from(new Set(products.map((p) => (p.imageUrl ? extractFilenameFromImageUrl(p.imageUrl) : null)).filter(Boolean) as string[]));

  if (!filenames.length) return;

  const res = await driveHasFilenames(filenames);
  const db = getFirestore();
  await db.collection("auditLogs").add({
    createdAt: Date.now(),
    userId: null,
    action: "CLOUD_IMAGE_SYNC_CHECK",
    entityType: "ProductImage",
    entityId: null,
    details: {
      totalFilenames: filenames.length,
      missing: res.missing,
      checkedAt: new Date().toISOString(),
    },
    userAgent: "worker/cloudSync",
  });
}

async function main() {
  const intervalMs = 5 * 60 * 1000;
  await runOnce();
  setInterval(() => {
    runOnce().catch(() => null);
  }, intervalMs);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
