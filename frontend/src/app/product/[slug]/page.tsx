import { notFound } from "next/navigation";
import AddToCartPanel from "@/components/product/AddToCartPanel";
import { getProductBySlug } from "@/lib/store/catalog";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product || !product.active) notFound();

  return (
    <div className="bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <AddToCartPanel
          product={{
            id: product.id,
            slug: product.slug,
            title: product.title,
            images: product.imageUrl ? [{ url: product.imageUrl, alt: product.title }] : [],
            variants: [
              {
                id: product.productCode,
                size: "One Size",
                color: "Default",
                pricePaise: product.pricePaise,
                stock: product.stock,
              },
            ],
          }}
        />

        <div className="mt-10 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">Product Details</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{product.description}</p>
          <div className="mt-4 text-xs text-neutral-500">
            Category: {product.category?.name || "Clothing"}
          </div>
        </div>
      </div>
    </div>
  );
}
