import { withRetry } from "@/lib/cloud/retry";

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function driveQueryForNames(names: string[]) {
  const parts = names.map((n) => `name = '${String(n).replace(/'/g, "\\'")}'`);
  return `(${parts.join(" or ")}) and trashed = false`;
}

export async function googleDriveHasFilenames(accessToken: string, filenames: string[]) {
  const unique = Array.from(new Set(filenames.filter(Boolean)));
  const found = new Set<string>();

  for (const batch of chunk(unique, 40)) {
    const q = driveQueryForNames(batch);
    const url =
      "https://www.googleapis.com/drive/v3/files?" +
      new URLSearchParams({
        q,
        fields: "files(id,name,mimeType)",
        pageSize: "1000",
      }).toString();

    const data = await withRetry(async () => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Google Drive API error: ${res.status} ${text}`);
      }
      return (await res.json()) as { files?: Array<{ name: string }> };
    });

    for (const f of data.files || []) {
      if (f?.name) found.add(f.name);
    }
  }

  const missing = unique.filter((n) => !found.has(n));
  return { found, missing };
}

