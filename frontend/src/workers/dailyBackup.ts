import { createHash } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getFirestore } from "../lib/firebaseAdmin";
import { listAllProducts } from "../lib/store/catalog";

async function exportProducts() {
  return listAllProducts({ limit: 100000 });
}

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

async function cleanupOldBackups(dir: string, retentionDays: number) {
  const files = await readdir(dir).catch(() => []);
  const now = Date.now();
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;

  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const fp = path.join(dir, f);
    const st = await stat(fp).catch(() => null);
    if (!st) continue;
    if (st.mtimeMs < cutoff) {
      await unlink(fp).catch(() => null);
    }
  }

  const db = getFirestore();
  const cutoff = Date.now();
  const snap = await db.collection("backupHistory").where("retainedUntil", "<", cutoff).get().catch(() => null);
  if (snap && !snap.empty) {
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit().catch(() => null);
  }
}

async function runOnce() {
  const backupDir = path.join(process.cwd(), "backups");
  await mkdir(backupDir, { recursive: true });

  const createdAt = new Date();
  const retainedUntil = createdAt.getTime() + 30 * 24 * 60 * 60 * 1000;
  const filename = `products-${createdAt.toISOString().replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(backupDir, filename);
  const db = getFirestore();

  try {
    const products = await exportProducts();
    const payload = Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), products }));
    await writeFile(filePath, payload);
    const checksum = sha256(payload);

    await db.collection("backupHistory").add({
      createdAt: Date.now(),
      status: "SUCCESS",
      rowCount: products.length,
      checksum,
      location: filePath,
      errorMessage: null,
      retainedUntil,
    });
  } catch (e: any) {
    await db.collection("backupHistory").add({
      createdAt: Date.now(),
      status: "FAILED",
      rowCount: 0,
      checksum: null,
      location: null,
      errorMessage: String(e?.message || e),
      retainedUntil,
    });
  }

  await cleanupOldBackups(backupDir, 30);
}

async function main() {
  const mode = (process.env.BACKUP_MODE || "daily").toLowerCase();
  if (mode === "once") {
    await runOnce();
    return;
  }

  const intervalMs = 24 * 60 * 60 * 1000;
  await runOnce();
  setInterval(() => {
    runOnce().catch(() => null);
  }, intervalMs);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
