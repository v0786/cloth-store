"use client";

import { useMemo, useRef, useState } from "react";

type PreviewResponse =
  | {
      batchId: string;
      canCommit: false;
      summary: { total: number; valid: number; errors: number };
      errors: Array<{ rowNumber: number; field?: string; message: string; suggestion?: string }>;
    }
  | {
      batchId: string;
      canCommit: true;
      summary: { total: number; toCreate: number; toUpdate: number };
      preview: Array<{
        rowNumber: number;
        productCode: string;
        productName: string;
        imageFilename: string;
        price: number;
        action: "CREATE" | "UPDATE";
      }>;
      cloudValidationMode: "SKIPPED" | "VALIDATED";
      cloudMissingCount: number;
    };

type CommitResponse =
  | { ok: true; batchId: string; created: number; updated: number; total: number; durationMs: number }
  | { error: string; batchId?: string };

function postFormJson<T>(url: string, form: FormData, onProgress?: (pct: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (!onProgress || !e.lengthComputable) return;
      onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const status = xhr.status;
      const data = xhr.response;
      if (status >= 200 && status < 300) resolve(data);
      else reject(Object.assign(new Error("Request failed"), { status, data }));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(form);
  });
}

export default function ExcelImportUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<"GOOGLE_DRIVE" | "ONEDRIVE">("GOOGLE_DRIVE");
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "previewing" | "ready" | "committing" | "done" | "error">("idle");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [commit, setCommit] = useState<CommitResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canCommit = useMemo(() => preview && "canCommit" in preview && preview.canCommit, [preview]);

  async function runPreview(nextFile: File) {
    setPhase("previewing");
    setProgress(0);
    setPreview(null);
    setCommit(null);
    setMessage(null);
    const form = new FormData();
    form.append("file", nextFile);
    form.append("provider", provider);

    try {
      const res = await postFormJson<PreviewResponse>("/api/admin/import/products/preview", form, setProgress);
      setPreview(res);
      setPhase("ready");
    } catch (e: any) {
      setPhase("error");
      setMessage(e?.data?.error || "Preview failed");
    }
  }

  async function runCommit() {
    if (!file || !preview || !("batchId" in preview) || !canCommit) return;
    setPhase("committing");
    setProgress(0);
    setCommit(null);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    form.append("provider", provider);
    form.append("batchId", preview.batchId);
    try {
      const res = await postFormJson<CommitResponse>("/api/admin/import/products/commit", form, setProgress);
      setCommit(res);
      if ("ok" in res && res.ok) setPhase("done");
      else setPhase("error");
    } catch (e: any) {
      setPhase("error");
      setMessage(e?.data?.error || "Commit failed");
    }
  }

  function onPick(f: File | null) {
    if (!f) return;
    setFile(f);
    runPreview(f);
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Upload file</div>
          <div className="text-xs text-neutral-500">Supports .xlsx and .xls</div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-xs text-neutral-500">Cloud</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value === "ONEDRIVE" ? "ONEDRIVE" : "GOOGLE_DRIVE")}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="GOOGLE_DRIVE">Google Drive</option>
            <option value="ONEDRIVE">OneDrive</option>
          </select>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded border px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Choose file
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div
        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-neutral-50 px-4 py-10 text-center"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files?.[0];
          onPick(dropped || null);
        }}
      >
        <div className="text-sm font-semibold">{file ? file.name : "Drag & drop Excel here"}</div>
        <div className="mt-1 text-xs text-neutral-500">or click to browse</div>
      </div>

      {phase === "previewing" || phase === "committing" ? (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded bg-neutral-100">
            <div className="h-2 bg-black" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-xs text-neutral-500">{phase === "previewing" ? "Validating…" : "Committing…"}</div>
        </div>
      ) : null}

      {message ? <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{message}</div> : null}

      {preview ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">Preview</div>
            {"batchId" in preview ? (
              <a className="text-sm hover:underline" href={`/api/admin/import/batches/${preview.batchId}/errors`}>
                Download error log
              </a>
            ) : null}
          </div>

          {"canCommit" in preview && !preview.canCommit ? (
            <div className="mt-3 rounded border bg-neutral-50 p-3 text-sm">
              <div>
                Valid rows: <span className="font-semibold">{preview.summary.valid}</span> · Errors:{" "}
                <span className="font-semibold">{preview.summary.errors}</span>
              </div>
              <div className="mt-2 text-xs text-neutral-600">Fix the errors and re-upload.</div>
              <div className="mt-3 space-y-2">
                {preview.errors.slice(0, 10).map((e, idx) => (
                  <div key={idx} className="rounded border bg-white p-2 text-xs">
                    <div className="font-semibold">
                      Row {e.rowNumber} {e.field ? `(${e.field})` : ""}
                    </div>
                    <div className="text-neutral-700">{e.message}</div>
                    {e.suggestion ? <div className="text-neutral-500">{e.suggestion}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded border bg-neutral-50 p-3 text-sm">
              <div>
                Total: <span className="font-semibold">{preview.summary.total}</span> · Create:{" "}
                <span className="font-semibold">{preview.summary.toCreate}</span> · Update:{" "}
                <span className="font-semibold">{preview.summary.toUpdate}</span>
              </div>
              {"cloudValidationMode" in preview ? (
                <div className="mt-1 text-xs text-neutral-600">
                  Cloud validation: {preview.cloudValidationMode} (missing: {preview.cloudMissingCount})
                </div>
              ) : null}
              <div className="mt-4 overflow-x-auto rounded border bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-50 text-left text-neutral-500">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Image</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {"preview" in preview
                      ? preview.preview.slice(0, 20).map((p) => (
                          <tr key={p.rowNumber} className="border-t">
                            <td className="px-3 py-2 text-neutral-500">{p.rowNumber}</td>
                            <td className="px-3 py-2 font-mono">{p.productCode}</td>
                            <td className="px-3 py-2">{p.productName}</td>
                            <td className="px-3 py-2">{p.imageFilename}</td>
                            <td className="px-3 py-2">{p.price}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-1 ${
                                  p.action === "CREATE"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {p.action}
                              </span>
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runCommit}
                  disabled={!canCommit || phase === "committing"}
                  className="rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Commit to database
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setCommit(null);
                    setMessage(null);
                    setPhase("idle");
                    setProgress(0);
                  }}
                  className="rounded border px-4 py-2 text-sm hover:bg-neutral-50"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {commit && "ok" in commit && commit.ok ? (
        <div className="mt-6 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Imported {commit.total} rows (created {commit.created}, updated {commit.updated}) in {commit.durationMs}ms.
        </div>
      ) : null}
    </div>
  );
}

