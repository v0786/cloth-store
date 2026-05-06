import Link from "next/link";
import { isFirestoreConfigured } from "@/lib/firebaseAdmin";
import { countProducts } from "@/lib/store/catalog";
import { listBatches } from "@/lib/store/imports";

export default async function AdminHome() {
  if (!isFirestoreConfigured()) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Firestore is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS) to load admin stats and import history.
        </p>
      </div>
    );
  }

  const [totalProducts, latestBatches] = await Promise.all([countProducts(), listBatches(10)]);

  const successCount = latestBatches.filter((b) => b.status === "COMMITTED").length;
  const failureCount = latestBatches.filter((b) => b.status === "FAILED").length;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-neutral-600">Uploads, success/failure rates, and catalog status.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500">Products</div>
          <div className="mt-1 text-2xl font-semibold">{totalProducts}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500">Firestore</div>
          <div className="mt-1 text-sm text-neutral-700">catalog + imports</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500">Last 10 Imports</div>
          <div className="mt-1 flex gap-3 text-sm">
            <div className="text-emerald-700">{successCount} success</div>
            <div className="text-rose-700">{failureCount} failed</div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Upload History</div>
          <Link href="/admin/import" className="text-sm hover:underline">
            New import
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Valid</th>
                <th className="px-4 py-3">Errors</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Logs</th>
              </tr>
            </thead>
            <tbody>
              {latestBatches.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-3 text-xs text-neutral-500">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{b.filename}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        b.status === "COMMITTED"
                          ? "bg-emerald-50 text-emerald-700"
                          : b.status === "FAILED"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{b.validRows}</td>
                  <td className="px-4 py-3">{b.errorRows}</td>
                  <td className="px-4 py-3 text-xs text-neutral-600">{b.createdByUserId}</td>
                  <td className="px-4 py-3">
                    {b.errorRows ? (
                      <a
                        className="text-sm hover:underline"
                        href={`/api/admin/import/batches/${b.id}/errors`}
                      >
                        Download errors
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
