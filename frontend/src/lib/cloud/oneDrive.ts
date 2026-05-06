import { withRetry } from "@/lib/cloud/retry";

async function oneDriveSearch(accessToken: string, filename: string) {
  const url =
    "https://graph.microsoft.com/v1.0/me/drive/root/search(q=" +
    encodeURIComponent(`'${filename}'`) +
    ")?$select=name";

  const data = await withRetry(async () => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OneDrive API error: ${res.status} ${text}`);
    }
    return (await res.json()) as { value?: Array<{ name?: string }> };
  });

  const names = new Set((data.value || []).map((v) => v.name).filter(Boolean) as string[]);
  return names.has(filename);
}

export async function oneDriveHasFilenames(accessToken: string, filenames: string[]) {
  const unique = Array.from(new Set(filenames.filter(Boolean)));
  const found = new Set<string>();
  const missing: string[] = [];

  const concurrency = 8;
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < unique.length) {
      const filename = unique[idx++];
      const ok = await oneDriveSearch(accessToken, filename);
      if (ok) found.add(filename);
      else missing.push(filename);
    }
  });

  await Promise.all(workers);
  return { found, missing };
}

