import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { listErrorsCsv } from "@/lib/store/imports";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("VIEWER");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const errors = await listErrorsCsv(params.id);

  const header = ["rowNumber", "productCode", "field", "message", "suggestion"].join(",");
  const lines = errors.map((e) =>
    [
      e.rowNumber,
      e.productCode || "",
      e.field || "",
      e.message.replace(/"/g, '""'),
      (e.suggestion || "").replace(/"/g, '""'),
    ]
      .map((v) => `"${String(v)}"`)
      .join(","),
  );

  const csv = [header, ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="import-errors-${params.id}.csv"`,
    },
  });
}
