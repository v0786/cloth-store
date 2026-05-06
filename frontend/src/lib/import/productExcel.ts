import * as XLSX from "xlsx";
import { z } from "zod";

export type ProductExcelRow = {
  rowNumber: number;
  productCode: string;
  productName: string;
  imageFilename: string;
  price: number;
  raw: Record<string, unknown>;
};

export type ProductExcelError = {
  rowNumber: number;
  productCode?: string;
  field?: string;
  message: string;
  suggestion?: string;
  raw?: Record<string, unknown>;
};

const AllowedImageExt = [".jpg", ".jpeg", ".png", ".webp"] as const;

function normalizeHeader(header: unknown) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExtLower(filename: string) {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "";
  return filename.slice(dot).toLowerCase();
}

function parsePrice(value: unknown) {
  if (typeof value === "number") return value;
  const s = String(value ?? "").trim();
  if (!s) return NaN;
  const cleaned = s.replace(/[,₹\s]/g, "");
  const n = Number(cleaned);
  return n;
}

const RowSchema = z.object({
  productCode: z.string().min(1),
  productName: z.string().min(1),
  imageFilename: z.string().min(1),
  price: z.number().finite().positive(),
});

export function parseProductExcel(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [] as ProductExcelRow[],
      errors: [{ rowNumber: 1, message: "Workbook has no sheets" }] as ProductExcelError[],
    };
  }

  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  if (!rawRows.length) {
    return {
      rows: [] as ProductExcelRow[],
      errors: [{ rowNumber: 1, message: "Sheet is empty" }] as ProductExcelError[],
    };
  }

  const headerKeys = Object.keys(rawRows[0] || {});
  const keyByNorm = new Map<string, string>();
  for (const key of headerKeys) keyByNorm.set(normalizeHeader(key), key);

  const codeKey =
    keyByNorm.get("sr no") ||
    keyByNorm.get("srno") ||
    keyByNorm.get("serial number") ||
    keyByNorm.get("product code") ||
    keyByNorm.get("productcode") ||
    keyByNorm.get("sku") ||
    "";
  const nameKey = keyByNorm.get("product name") || keyByNorm.get("name") || "";
  const imageKey =
    keyByNorm.get("product image filename") ||
    keyByNorm.get("product image") ||
    keyByNorm.get("image filename") ||
    keyByNorm.get("image") ||
    "";
  const priceKey = keyByNorm.get("price") || keyByNorm.get("mrp") || "";

  const missing: string[] = [];
  if (!codeKey) missing.push("sr.no / product code");
  if (!nameKey) missing.push("product name");
  if (!imageKey) missing.push("product image filename");
  if (!priceKey) missing.push("price");
  if (missing.length) {
    return {
      rows: [] as ProductExcelRow[],
      errors: [
        {
          rowNumber: 1,
          message: `Missing mandatory column(s): ${missing.join(", ")}`,
          suggestion: "Add the missing columns to the header row and try again.",
          raw: { headers: headerKeys },
        },
      ] as ProductExcelError[],
    };
  }

  const errors: ProductExcelError[] = [];
  const rows: ProductExcelRow[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const excelRowNumber = i + 2;
    const raw = rawRows[i] || {};
    const productCode = String(raw[codeKey] ?? "").trim();
    const productName = String(raw[nameKey] ?? "").trim();
    const imageFilename = String(raw[imageKey] ?? "").trim();
    const price = parsePrice(raw[priceKey]);

    const parsed = RowSchema.safeParse({
      productCode,
      productName,
      imageFilename,
      price,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      errors.push({
        rowNumber: excelRowNumber,
        productCode: productCode || undefined,
        field: first?.path?.[0] ? String(first.path[0]) : undefined,
        message: first?.message || "Invalid row",
        suggestion: "Fix the invalid value and re-upload.",
        raw,
      });
      continue;
    }

    if (seenCodes.has(productCode)) {
      errors.push({
        rowNumber: excelRowNumber,
        productCode,
        field: "productCode",
        message: "Duplicate product code in file",
        suggestion: "Ensure product code is unique within the Excel file.",
        raw,
      });
      continue;
    }
    seenCodes.add(productCode);

    const ext = getExtLower(imageFilename);
    if (!AllowedImageExt.includes(ext as any)) {
      errors.push({
        rowNumber: excelRowNumber,
        productCode,
        field: "imageFilename",
        message: `Invalid image extension "${ext || "(none)"}"`,
        suggestion: `Use one of: ${AllowedImageExt.join(", ")}`,
        raw,
      });
      continue;
    }

    rows.push({
      rowNumber: excelRowNumber,
      productCode,
      productName,
      imageFilename,
      price,
      raw,
    });
  }

  return { rows, errors };
}

