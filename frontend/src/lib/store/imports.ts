import { getFirestore } from "@/lib/firebaseAdmin";

export type ImportBatchStatus = "PENDING" | "VALIDATED" | "COMMITTED" | "FAILED";

export type ImportBatch = {
  id: string;
  createdAt: number;
  createdByUserId: string;
  filename: string;
  status: ImportBatchStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  durationMs?: number;
  committedAt?: number;
};

export type ImportRowError = {
  id: string;
  batchId: string;
  rowNumber: number;
  productCode?: string | null;
  field?: string | null;
  message: string;
  suggestion?: string | null;
  raw?: Record<string, unknown> | null;
  createdAt: number;
};

function batchesCol() {
  return getFirestore().collection("importBatches");
}

function errorsCol(batchId: string) {
  return batchesCol().doc(batchId).collection("errors");
}

export async function createBatch(params: Omit<ImportBatch, "id" | "createdAt">) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const batch: ImportBatch = { ...params, id, createdAt: Date.now() };
  await batchesCol().doc(id).set(batch);
  return batch;
}

export async function updateBatch(batchId: string, patch: Partial<ImportBatch>) {
  await batchesCol().doc(batchId).update({ ...patch });
}

export async function addErrors(batchId: string, errs: Omit<ImportRowError, "id" | "createdAt" | "batchId">[]) {
  const db = getFirestore();
  const chunks: Array<typeof errs> = [];
  for (let i = 0; i < errs.length; i += 400) chunks.push(errs.slice(i, i + 400));
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const e of chunk) {
      const id = `${e.rowNumber}-${Math.random().toString(16).slice(2)}`;
      const doc: ImportRowError = {
        id,
        batchId,
        rowNumber: e.rowNumber,
        productCode: e.productCode ?? null,
        field: e.field ?? null,
        message: e.message,
        suggestion: e.suggestion ?? null,
        raw: (e.raw as any) ?? null,
        createdAt: Date.now(),
      };
      batch.set(errorsCol(batchId).doc(id), doc);
    }
    await batch.commit();
  }
}

export async function listBatches(limit = 100) {
  const snap = await batchesCol().orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as ImportBatch);
}

export async function listErrorsCsv(batchId: string) {
  const snap = await errorsCol(batchId).orderBy("rowNumber", "asc").get();
  const errs = snap.docs.map((d) => d.data() as ImportRowError);
  return errs;
}

