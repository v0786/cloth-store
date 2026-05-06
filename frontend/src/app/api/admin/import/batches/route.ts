import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { listBatches } from "@/lib/store/imports";

export async function GET() {
  const session = await requireRole("VIEWER");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batches = await listBatches(100);

  return NextResponse.json(batches);
}
