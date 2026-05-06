import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { createProduct, listProducts } from "@/lib/store/catalog";

const CreateSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(140),
  description: z.string().min(5).max(2000),
  categorySlug: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export async function GET() {
  const session = await requireRole("VIEWER");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await listProducts({ limit: 500 });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await requireRole("MANAGER");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const res = await createProduct({
    productCode: parsed.data.slug,
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.categorySlug ? { slug: parsed.data.categorySlug, name: parsed.data.categorySlug } : null,
    active: parsed.data.active,
    pricePaise: 0,
    stock: 0,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json(res.product);
}
