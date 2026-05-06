import { NextResponse } from "next/server";
import { listProducts } from "@/lib/store/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const products = await listProducts({ categorySlug: category, q, limit: 200 });
  const payload = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
    image: p.imageUrl || null,
    priceFromPaise: p.pricePaise,
    inStock: p.stock > 0,
  }));

  return NextResponse.json(payload);
}
