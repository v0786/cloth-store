import { google } from "googleapis";
import { Readable } from "node:stream";

function getDriveAuth() {
  const raw = process.env.GDRIVE_SERVICE_ACCOUNT_JSON || "";
  if (!raw) {
    return new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  }

  const creds = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export async function getDriveClient() {
  const auth = getDriveAuth();
  const authClient = await auth.getClient();
  return google.drive({ version: "v3", auth: authClient });
}

export async function driveFindFileIdsByName(filename: string) {
  const drive = await getDriveClient();
  const folderId = process.env.GDRIVE_FOLDER_ID || "";
  const qParts = [`name = '${String(filename).replace(/'/g, "\\'")}'`, "trashed = false"];
  if (folderId) qParts.push(`'${folderId}' in parents`);
  const q = qParts.join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id,name,mimeType,parents)",
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (res.data.files || []).map((f) => f.id!).filter(Boolean);
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function driveHasFilenames(filenames: string[]) {
  const unique = Array.from(new Set(filenames.filter(Boolean)));
  const found = new Set<string>();

  const drive = await getDriveClient();
  const folderId = process.env.GDRIVE_FOLDER_ID || "";

  for (const group of chunk(unique, 40)) {
    const parts = group.map((n) => `name = '${String(n).replace(/'/g, "\\'")}'`).join(" or ");
    const qParts = [`(${parts})`, "trashed = false"];
    if (folderId) qParts.push(`'${folderId}' in parents`);
    const q = qParts.join(" and ");

    const res = await drive.files.list({
      q,
      fields: "files(name)",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files || []) {
      if (f.name) found.add(f.name);
    }
  }

  const missing = unique.filter((n) => !found.has(n));
  return { found, missing };
}

export async function driveDownloadByFileId(fileId: string) {
  const drive = await getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as any);
}

export async function driveUploadImage(params: { filename: string; mimeType: string; data: Buffer }) {
  const drive = await getDriveClient();
  const folderId = process.env.GDRIVE_FOLDER_ID || "";

  const res = await drive.files.create({
    requestBody: {
      name: params.filename,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.data),
    },
    fields: "id,name",
    supportsAllDrives: true,
  });

  return { id: res.data.id || "", name: res.data.name || params.filename };
}
