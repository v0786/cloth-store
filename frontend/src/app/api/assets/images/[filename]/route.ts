import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { driveDownloadByFileId, driveFindFileIdsByName } from "@/lib/gdrive";

export const runtime = "nodejs";

function contentTypeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

async function tryLocalPublicImage(filename: string) {
  const publicDir = path.join(process.cwd(), "public", "images");
  const filePath = path.join(publicDir, filename);
  const data = await readFile(filePath);
  return data;
}

async function tryGoogleDrive(filename: string) {
  try {
    const ids = await driveFindFileIdsByName(filename);
    const id = ids[0];
    if (!id) return null;
    return await driveDownloadByFileId(id);
  } catch {
    return null;
  }
}

async function tryOneDrive(filename: string) {
  const token = process.env.SYSTEM_ONEDRIVE_TOKEN || "";
  if (!token) return null;

  const searchUrl =
    "https://graph.microsoft.com/v1.0/me/drive/root/search(q=" +
    encodeURIComponent(`'${filename}'`) +
    ")?$top=1&$select=id,name";
  const search = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!search.ok) return null;
  const searchJson = (await search.json()) as { value?: Array<{ id: string }> };
  const id = searchJson.value?.[0]?.id;
  if (!id) return null;

  const contentUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${id}/content`;
  const res = await fetch(contentUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

export async function GET(_request: Request, { params }: { params: { filename: string } }) {
  const filename = decodeURIComponent(params.filename || "").trim();
  if (!filename) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const data = await tryLocalPublicImage(filename);
    return new NextResponse(data, {
      headers: {
        "content-type": contentTypeFromName(filename),
        "cache-control": "public, max-age=300",
      },
    });
  } catch {}

  const fromGoogle = await tryGoogleDrive(filename);
  if (fromGoogle) {
    return new NextResponse(fromGoogle, {
      headers: {
        "content-type": contentTypeFromName(filename),
        "cache-control": "public, max-age=300",
      },
    });
  }

  const fromOneDrive = await tryOneDrive(filename);
  if (fromOneDrive) {
    return new NextResponse(fromOneDrive, {
      headers: {
        "content-type": contentTypeFromName(filename),
        "cache-control": "public, max-age=300",
      },
    });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
