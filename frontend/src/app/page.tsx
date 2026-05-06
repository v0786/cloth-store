import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { listCategories, listProducts } from "@/lib/store/catalog";

export default async function Home() {
  const [products, categories] = await Promise.all([
    listProducts({ limit: 50 }),
    listCategories(),
  ]);

  return (
    <div className="bg-neutral-50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight">Shop Clothing Online</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Amazon/Flipkart-style catalog with cart, checkout, COD and online payments, order tracking, and an admin dashboard.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-full border bg-black px-4 py-2 text-xs font-semibold text-white"
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-full border bg-white px-4 py-2 text-xs font-semibold hover:bg-neutral-100"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                title: p.title,
                slug: p.slug,
                category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
                image: p.imageUrl || null,
                priceFromPaise: p.pricePaise,
                inStock: p.stock > 0,
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
