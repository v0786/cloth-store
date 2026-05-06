import { getFirestore } from "@/lib/firebaseAdmin";
import { slugify } from "@/lib/slugs";

export type Category = {
  id: string;
  name: string;
  slug: string;
  createdAt?: number;
  updatedAt?: number;
};

export type Product = {
  id: string;
  productCode: string;
  title: string;
  slug: string;
  description: string;
  category?: { slug: string; name: string } | null;
  active: boolean;
  imageFilename?: string | null;
  imageUrl?: string | null;
  pricePaise: number;
  stock: number;
  createdAt?: number;
  updatedAt?: number;
};

function productsCol() {
  return getFirestore().collection("products");
}

function categoriesCol() {
  return getFirestore().collection("categories");
}

export async function countProducts() {
  try {
    const snap = await (productsCol() as any).count().get();
    const data = snap.data();
    const n = Number(data?.count);
    if (Number.isFinite(n)) return n;
  } catch {}
  try {
    const snap = await productsCol().get();
    return snap.size;
  } catch {
    return 0;
  }
}

export async function countCategories() {
  try {
    const snap = await (categoriesCol() as any).count().get();
    const data = snap.data();
    const n = Number(data?.count);
    if (Number.isFinite(n)) return n;
  } catch {}
  try {
    const snap = await categoriesCol().get();
    return snap.size;
  } catch {
    return 0;
  }
}

export async function listCategories() {
  try {
    const snap = await categoriesCol().orderBy("name", "asc").get();
    return snap.docs.map((d) => d.data() as Category);
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string) {
  try {
    const snap = await categoriesCol().where("slug", "==", slug).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as Category);
  } catch {
    return null;
  }
}

export async function listProducts(params: { categorySlug?: string | null; q?: string | null; limit?: number }) {
  const limit = params.limit ?? 200;
  let items: Product[] = [];
  try {
    let query = productsCol().where("active", "==", true);
    if (params.categorySlug) query = query.where("category.slug", "==", params.categorySlug);
    const snap = await query.orderBy("updatedAt", "desc").limit(limit).get();
    items = snap.docs.map((d) => d.data() as Product);
  } catch {
    items = [];
  }

  const query = (params.q || "").trim().toLowerCase();
  if (!query) return items;

  return items.filter((p) => {
    const hay = `${p.title} ${p.description} ${p.slug} ${p.productCode}`.toLowerCase();
    return hay.includes(query);
  });
}

export async function listAllProducts(params?: { limit?: number }) {
  const limit = params?.limit ?? 100000;
  try {
    const snap = await productsCol().orderBy("updatedAt", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data() as Product);
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const snap = await productsCol().where("slug", "==", slug).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as Product);
  } catch {
    return null;
  }
}

export async function getProductById(id: string) {
  try {
    const snap = await productsCol().doc(id).get();
    return snap.exists ? (snap.data() as Product) : null;
  } catch {
    return null;
  }
}

export async function createProduct(params: {
  productCode: string;
  title: string;
  description: string;
  category?: { slug: string; name: string } | null;
  active?: boolean;
  imageFilename?: string | null;
  pricePaise: number;
  stock?: number;
}) {
  const now = Date.now();
  const code = params.productCode.trim();
  const ref = productsCol().doc(code);
  const exists = await ref.get();
  if (exists.exists) return { ok: false as const, error: "Product code already exists" };

  const imageUrl = params.imageFilename ? `/api/assets/images/${encodeURIComponent(params.imageFilename)}` : null;
  const doc: Product = {
    id: code,
    productCode: code,
    title: params.title,
    slug: slugify(`${params.title}-${code}`) || code.toLowerCase(),
    description: params.description,
    category: params.category ?? null,
    active: params.active ?? true,
    imageFilename: params.imageFilename ?? null,
    imageUrl,
    pricePaise: params.pricePaise,
    stock: params.stock ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(doc);
  return { ok: true as const, product: doc };
}

export async function updateProduct(id: string, patch: Partial<Omit<Product, "id" | "productCode">>) {
  const ref = productsCol().doc(id);
  await ref.update({ ...patch, updatedAt: Date.now() });
  return getProductById(id);
}

export async function deleteProduct(id: string) {
  await productsCol().doc(id).delete();
}

export async function getProductsByCodes(codes: string[]) {
  const uniq = Array.from(new Set(codes.filter(Boolean)));
  const refs = uniq.map((c) => productsCol().doc(c));
  const snaps = await getFirestore().getAll(...refs);
  const found = new Map<string, Product>();
  for (const s of snaps) {
    if (!s.exists) continue;
    found.set(s.id, s.data() as Product);
  }
  return found;
}

export async function upsertProductFromImport(params: {
  productCode: string;
  productName: string;
  imageFilename: string;
  pricePaise: number;
  imageUrlForFilename: (filename: string) => string;
}) {
  const code = params.productCode.trim();
  const ref = productsCol().doc(code);
  const snap = await ref.get();
  const now = Date.now();
  const imageUrl = params.imageUrlForFilename(params.imageFilename);

  if (!snap.exists) {
    const slug = slugify(`${params.productName}-${code}`) || code.toLowerCase();
    const doc: Product = {
      id: code,
      productCode: code,
      title: params.productName,
      slug,
      description: params.productName,
      category: null,
      active: true,
      imageFilename: params.imageFilename,
      imageUrl,
      pricePaise: params.pricePaise,
      stock: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(doc);
    return { action: "CREATE" as const, product: doc };
  }

  const existing = snap.data() as Product;
  const updated: Partial<Product> = {
    title: params.productName,
    description: params.productName,
    imageFilename: params.imageFilename,
    imageUrl,
    pricePaise: params.pricePaise,
    updatedAt: now,
  };
  await ref.update(updated);
  return { action: "UPDATE" as const, product: { ...existing, ...updated } as Product };
}
