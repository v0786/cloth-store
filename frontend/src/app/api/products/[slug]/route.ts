import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/store/catalog";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product || !product.active) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
    images: product.imageUrl ? [{ url: product.imageUrl, alt: product.title, sortOrder: 0 }] : [],
    variants: [
      {
        id: product.productCode,
        sku: product.productCode,
        size: "One Size",
        color: "Default",
        pricePaise: product.pricePaise,
        stock: product.stock,
      },
    ],
  });
}
