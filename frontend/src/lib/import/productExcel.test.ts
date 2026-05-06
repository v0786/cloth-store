import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseProductExcel } from "./productExcel";

function makeWorkbookBuffer(rows: Array<Record<string, any>>) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

describe("parseProductExcel", () => {
  it("parses valid rows with mandatory columns", () => {
    const buf = makeWorkbookBuffer([
      { "sr.no": "A1", "product name": "Shirt", "product image filename": "shirt.jpg", price: 499 },
      { "sr.no": "A2", "product name": "Jeans", "product image filename": "jeans.png", price: "999" },
    ]);
    const res = parseProductExcel(buf);
    expect(res.errors.length).toBe(0);
    expect(res.rows.length).toBe(2);
    expect(res.rows[0].productCode).toBe("A1");
  });

  it("fails when mandatory headers are missing", () => {
    const buf = makeWorkbookBuffer([{ a: 1 }]);
    const res = parseProductExcel(buf);
    expect(res.rows.length).toBe(0);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("reports duplicate product codes within the file", () => {
    const buf = makeWorkbookBuffer([
      { sku: "X1", name: "A", image: "a.jpg", price: 10 },
      { sku: "X1", name: "B", image: "b.jpg", price: 20 },
    ]);
    const res = parseProductExcel(buf);
    expect(res.rows.length).toBe(1);
    expect(res.errors.some((e) => e.message.toLowerCase().includes("duplicate"))).toBe(true);
  });
});

