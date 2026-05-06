import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { parseProductExcel } from "@/lib/import/productExcel";
import { buildImportPreview } from "@/lib/import/productImport";
import { validateImageFilenamesInCloud } from "@/lib/cloud/imageValidation";
import { addErrors, createBatch, updateBatch } from "@/lib/store/imports";

export const runtime = "nodejs";

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

  const batch = await createBatch({
    createdByUserId: userId,
    filename,
    status: parsed.errors.length ? "FAILED" : "VALIDATED",
    totalRows: parsed.rows.length + parsed.errors.length,
    validRows: parsed.rows.length,
    errorRows: parsed.errors.length,
    durationMs: Date.now() - startedAt,
  });

  if (parsed.errors.length) {
    await addErrors(
      batch.id,
      parsed.errors.map((e) => ({
        rowNumber: e.rowNumber,
        productCode: e.productCode || null,
        field: e.field || null,
        message: e.message,
        suggestion: e.suggestion || null,
        raw: (e.raw as any) || null,
      })),
    );

    return NextResponse.json({
      batchId: batch.id,
      canCommit: false,
      summary: { total: parsed.rows.length + parsed.errors.length, valid: parsed.rows.length, errors: parsed.errors.length },
      errors: parsed.errors.slice(0, 50),
    });
  }

  const preview = await buildImportPreview(parsed.rows);

  const uniqueFilenames = Array.from(new Set(preview.map((p) => p.imageFilename)));
  const cloudValidation = await validateImageFilenamesInCloud({
    userId,
    provider: cloudProvider,
    filenames: uniqueFilenames,
  });

  if (cloudValidation.mode === "VALIDATED" && cloudValidation.missing.length) {
    await updateBatch(batch.id, { status: "FAILED", errorRows: cloudValidation.missing.length, validRows: 0 });

    await addErrors(
      batch.id,
      cloudValidation.missing.map((name, idx) => ({
        rowNumber: idx + 2,
        productCode: null,
        field: "imageFilename",
        message: `Image not found in ${cloudProvider}`,
        suggestion: `Upload "${name}" to ${cloudProvider} or fix the filename in Excel.`,
        raw: { imageFilename: name },
      })),
    );

    return NextResponse.json({
      batchId: batch.id,
      canCommit: false,
      summary: { total: preview.length, valid: 0, errors: cloudValidation.missing.length },
      errors: cloudValidation.missing.slice(0, 50).map((name) => ({
        rowNumber: 0,
        field: "imageFilename",
        message: `Image not found in ${cloudProvider}`,
        suggestion: `Upload "${name}" to ${cloudProvider} or fix the filename in Excel.`,
      })),
    });
  }

  return NextResponse.json({
    batchId: batch.id,
    canCommit: true,
    summary: {
      total: preview.length,
      toCreate: preview.filter((p) => p.action === "CREATE").length,
      toUpdate: preview.filter((p) => p.action === "UPDATE").length,
    },
    preview: preview.slice(0, 200),
    cloudValidationMode: cloudValidation.mode,
    cloudMissingCount: cloudValidation.missing.length,
  });
}
