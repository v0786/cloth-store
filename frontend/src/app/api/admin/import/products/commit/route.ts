import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { parseProductExcel } from "@/lib/import/productExcel";
import { commitImport } from "@/lib/import/productImport";
import { validateImageFilenamesInCloud } from "@/lib/cloud/imageValidation";
import { addErrors, createBatch, updateBatch } from "@/lib/store/imports";

export const runtime = "nodejs";

function imageUrlForFilename(filename: string) {
  return `/api/assets/images/${encodeURIComponent(filename)}`;
}

export async function POST(request: Request) {
  const session = await requireRole("MANAGER");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  const provider = String(form.get("provider") || "GOOGLE_DRIVE").toUpperCase();
  const cloudProvider = provider === "ONEDRIVE" ? "ONEDRIVE" : "GOOGLE_DRIVE";
  const batchId = String(form.get("batchId") || "").trim() || undefined;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const filename = file.name || "upload.xlsx";
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 });
  }
  const lower = filename.toLowerCase();
  if (!(lower.endsWith(".xlsx") || lower.endsWith(".xls"))) {
    return NextResponse.json({ error: "Only .xlsx and .xls files are supported" }, { status: 400 });
  }

  const startedAt = Date.now();
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseProductExcel(buffer);

  if (parsed.errors.length) {
    const created = await createBatch({
      createdByUserId: userId,
      filename,
      status: "FAILED",
      totalRows: parsed.rows.length + parsed.errors.length,
      validRows: parsed.rows.length,
      errorRows: parsed.errors.length,
      durationMs: Date.now() - startedAt,
    });

    await addErrors(
      created.id,
      parsed.errors.map((e) => ({
        rowNumber: e.rowNumber,
        productCode: e.productCode || null,
        field: e.field || null,
        message: e.message,
        suggestion: e.suggestion || null,
        raw: (e.raw as any) || null,
      })),
    );

    return NextResponse.json({ error: "Validation failed", batchId: created.id }, { status: 400 });
  }

  const uniqueFilenames = Array.from(new Set(parsed.rows.map((r) => r.imageFilename)));
  const cloudValidation = await validateImageFilenamesInCloud({
    userId,
    provider: cloudProvider,
    filenames: uniqueFilenames,
  });

  if (cloudValidation.mode === "VALIDATED" && cloudValidation.missing.length) {
    const created = await createBatch({
      createdByUserId: userId,
      filename,
      status: "FAILED",
      totalRows: parsed.rows.length,
      validRows: 0,
      errorRows: cloudValidation.missing.length,
      durationMs: Date.now() - startedAt,
    });

    await addErrors(
      created.id,
      cloudValidation.missing.map((name, idx) => ({
        rowNumber: idx + 2,
        productCode: null,
        field: "imageFilename",
        message: `Image not found in ${cloudProvider}`,
        suggestion: `Upload "${name}" to ${cloudProvider} or fix the filename in Excel.`,
        raw: { imageFilename: name },
      })),
    );

    return NextResponse.json({ error: "Image validation failed", batchId: created.id }, { status: 400 });
  }

  const activeBatchId =
    batchId ||
    (
      await createBatch({
        createdByUserId: userId,
        filename,
        status: "PENDING",
        totalRows: parsed.rows.length,
        validRows: parsed.rows.length,
        errorRows: 0,
      })
    ).id;

  const committed = await commitImport({
    rows: parsed.rows,
    userId,
    batchId: activeBatchId,
    imageUrlForFilename,
  });

  await updateBatch(activeBatchId, {
    status: "COMMITTED",
    committedAt: Date.now(),
    durationMs: committed.durationMs,
    totalRows: committed.total,
    validRows: committed.total,
    errorRows: 0,
  });

  return NextResponse.json({ ok: true, batchId: activeBatchId, ...committed });
}
