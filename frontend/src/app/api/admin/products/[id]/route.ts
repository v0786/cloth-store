import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/permissions";
import { deleteProduct, getProductById, updateProduct } from "@/lib/store/catalog";

const UpdateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(140).optional(),
  description: z.string().min(5).max(2000).optional(),
  categorySlug: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("MANAGER");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await getProductById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await updateProduct(params.id, {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
    ...(parsed.data.categorySlug !== undefined
      ? { category: parsed.data.categorySlug ? { slug: parsed.data.categorySlug, name: parsed.data.categorySlug } : null }
      : {}),
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole("ADMIN");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteProduct(params.id);
  return NextResponse.json({ ok: true });
}
