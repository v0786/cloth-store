import Link from "next/link";
import Image from "next/image";
import { formatINR } from "@/lib/money";

export type ProductCardModel = {
  id: string;
  title: string;
  slug: string;
  category?: { name: string; slug: string } | null;
  image?: string | null;
  priceFromPaise?: number | null;
  inStock?: boolean;
};

export default function ProductCard({ product }: { product: ProductCardModel }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : null}
      </div>

      <div className="mt-3">
        <div className="text-xs text-neutral-500">{product.category?.name || "Clothing"}</div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold">{product.title}</div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm font-semibold">
            {product.priceFromPaise != null ? formatINR(product.priceFromPaise) : "—"}
          </div>
          <div className={`text-xs ${product.inStock ? "text-emerald-700" : "text-rose-600"}`}>
            {product.inStock ? "In stock" : "Out of stock"}
          </div>
        </div>
      </div>
    </Link>
  );
}

