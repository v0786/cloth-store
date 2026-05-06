import Link from "next/link";
import { formatINR } from "@/lib/money";
import { isFirestoreConfigured } from "@/lib/firebaseAdmin";
import { listCategories, listProducts, type Product as StoreProduct } from "@/lib/store/catalog";

type SortKey = "updated_desc" | "updated_asc" | "title_asc" | "title_desc" | "price_asc" | "price_desc";

function asInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  if (!isFirestoreConfigured()) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Firestore is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS).
        </p>
      </div>
    );
  }

  const q = String(searchParams.q || "").trim();
  const category = String(searchParams.category || "").trim();
  const minPrice = asInt(String(searchParams.minPrice || ""), 0);
  const maxPrice = asInt(String(searchParams.maxPrice || ""), 0);
  const sort = (String(searchParams.sort || "updated_desc") as SortKey) || "updated_desc";
  const page = Math.max(1, asInt(String(searchParams.page || ""), 1));
  const take = 50;
  const skip = (page - 1) * take;

  const [categories, all] = await Promise.all([listCategories(), listProducts({ limit: 10000 })]);

  const filtered = all.filter((p) => {
    if (category && p.category?.slug !== category) return false;
    if (minPrice && p.pricePaise < minPrice * 100) return false;
    if (maxPrice && p.pricePaise > maxPrice * 100) return false;
    if (q) {
      const hay = `${p.title} ${p.description} ${p.slug} ${p.productCode}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a: StoreProduct, b: StoreProduct) => {
    if (sort === "title_asc") return a.title.localeCompare(b.title);
    if (sort === "title_desc") return b.title.localeCompare(a.title);
    if (sort === "updated_asc") return (a.updatedAt || 0) - (b.updatedAt || 0);
    if (sort === "price_asc") return a.pricePaise - b.pricePaise;
    if (sort === "price_desc") return b.pricePaise - a.pricePaise;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / take));
  const products = sorted.slice(skip, skip + take);

  function pageHref(nextPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (minPrice) sp.set("minPrice", String(minPrice));
    if (maxPrice) sp.set("maxPrice", String(maxPrice));
    sp.set("sort", sort);
    sp.set("page", String(nextPage));
    return `/admin/products?${sp.toString()}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Products</h1>
      <p className="mt-2 text-sm text-neutral-600">Search by name, SKU/product code, price range, and category.</p>

      <form className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label className="text-xs text-neutral-500">Search</label>
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="name / sku / slug"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Category</label>
          <select name="category" defaultValue={category} className="mt-1 w-full rounded border px-3 py-2 text-sm">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Min price</label>
          <input
            name="minPrice"
            type="number"
            defaultValue={minPrice || ""}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Max price</label>
          <input
            name="maxPrice"
            type="number"
            defaultValue={maxPrice || ""}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Sort</label>
          <select name="sort" defaultValue={sort} className="mt-1 w-full rounded border px-3 py-2 text-sm">
            <option value="updated_desc">Updated (newest)</option>
            <option value="updated_asc">Updated (oldest)</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
            <option value="price_asc">Price (low-high)</option>
            <option value="price_desc">Price (high-low)</option>
          </select>
        </div>
        <div className="sm:col-span-6">
          <button className="rounded bg-black px-4 py-2 text-sm font-semibold text-white">Search</button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">SKU count</th>
              <th className="px-4 py-3">Min price</th>
              <th className="px-4 py-3">In stock</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const min = p.pricePaise ?? null;
              const inStock = (p.stock || 0) > 0;
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-neutral-500">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">{p.category?.name || "—"}</td>
                  <td className="px-4 py-3">1</td>
                  <td className="px-4 py-3">{min != null ? formatINR(min) : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${inStock ? "text-emerald-700" : "text-rose-700"}`}>
                      {inStock ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-neutral-600">
          {total} items · page {page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`rounded border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-neutral-50"}`}
          >
            Prev
          </Link>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`rounded border px-3 py-1.5 ${
              page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-neutral-50"
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
