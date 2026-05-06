import type { ProductExcelRow } from "@/lib/import/productExcel";
import { getProductsByCodes, upsertProductFromImport } from "@/lib/store/catalog";
import { getFirestore } from "@/lib/firebaseAdmin";

export type ImportPreviewItem = {
  rowNumber: number;
  productCode: string;
  productName: string;
  imageFilename: string;
  price: number;
  pricePaise: number;
  action: "CREATE" | "UPDATE";
};

function toPaise(price: number) {
  return Math.round(price * 100);
}

export async function buildImportPreview(rows: ProductExcelRow[]) {
  const codes = rows.map((r) => r.productCode);
  const existingByCode = await getProductsByCodes(codes);

  const preview: ImportPreviewItem[] = rows.map((r) => {
    const found = existingByCode.get(r.productCode);
    return {
      rowNumber: r.rowNumber,
      productCode: r.productCode,
      productName: r.productName,
      imageFilename: r.imageFilename,
      price: r.price,
      pricePaise: toPaise(r.price),
      action: found ? "UPDATE" : "CREATE",
    };
  });

  return preview;
}

export async function commitImport(params: {
  rows: ProductExcelRow[];
  userId?: string;
  batchId?: string;
  imageUrlForFilename: (filename: string) => string;
}) {
  const startedAt = Date.now();
  const preview = await buildImportPreview(params.rows);

  const db = getFirestore();
  let created = 0;
  let updated = 0;

  for (const item of preview) {
    const res = await upsertProductFromImport({
      productCode: item.productCode,
      productName: item.productName,
      imageFilename: item.imageFilename,
      pricePaise: item.pricePaise,
      imageUrlForFilename: params.imageUrlForFilename,
    });
    if (res.action === "CREATE") created++;
    else updated++;
  }

  await db.collection("auditLogs").add({
    createdAt: Date.now(),
    userId: params.userId || null,
    action: "IMPORT_PRODUCTS",
    entityType: "Product",
    entityId: null,
    details: { created, updated, total: preview.length },
    batchId: params.batchId || null,
  });

  return { created, updated, total: preview.length, durationMs: Date.now() - startedAt };
}
