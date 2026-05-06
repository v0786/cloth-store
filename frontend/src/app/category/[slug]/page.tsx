import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, listProducts } from "@/lib/store/catalog";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const products = await listProducts({ categorySlug: category.slug, limit: 200 });

  return (
    <div className="bg-neutral-50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-xs text-neutral-500">
            <Link href="/" className="hover:underline">Home</Link> / {category.name}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{category.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Browse {category.name} with sizes, colors, and stock tracking.
          </p>
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
