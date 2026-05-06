import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { driveUploadImage } from "@/lib/gdrive";

export const runtime = "nodejs";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await requireRole("MANAGER");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  const filenameOverride = String(form.get("filename") || "").trim();
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });

  const mimeType = file.type || "application/octet-stream";
  if (!allowed.has(mimeType)) {
    return NextResponse.json({ error: "Invalid image type. Use .jpg/.jpeg, .png, or .webp" }, { status: 400 });
  }

  const filename = filenameOverride || file.name || `image-${Date.now()}`;
  const data = Buffer.from(await file.arrayBuffer());

  const uploaded = await driveUploadImage({ filename, mimeType, data });
  return NextResponse.json({
    ok: true,
    fileId: uploaded.id,
    filename: uploaded.name,
    url: `/api/assets/images/${encodeURIComponent(uploaded.name)}`,
  });
}

