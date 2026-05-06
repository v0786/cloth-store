"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatINR } from "@/lib/money";

type Variant = {
  id: string;
  size: string;
  color: string;
  pricePaise: number;
  stock: number;
};

export default function AddToCartPanel({
  product,
}: {
  product: {
    id: string;
    slug: string;
    title: string;
    images: { url: string; alt?: string | null }[];
    variants: Variant[];
  };
}) {
  const { addItem } = useCart();
  const [color, setColor] = useState<string>(() => product.variants[0]?.color || "");
  const [size, setSize] = useState<string>(() => product.variants[0]?.size || "");
  const [quantity, setQuantity] = useState<number>(1);

  const colors = useMemo(() => Array.from(new Set(product.variants.map((v) => v.color))), [product.variants]);
  const sizesForColor = useMemo(
    () =>
      Array.from(new Set(product.variants.filter((v) => v.color === color).map((v) => v.size))),
    [product.variants, color],
  );

  const selectedVariant = useMemo(() => {
    return product.variants.find((v) => v.color === color && v.size === size) || null;
  }, [product.variants, color, size]);

  const disabled = !selectedVariant || selectedVariant.stock <= 0;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="grid gap-3">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
          {product.images[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt || product.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : null}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {product.images.slice(0, 4).map((img) => (
            <div key={img.url} className="relative aspect-square overflow-hidden rounded-lg border bg-white">
              <Image
                src={img.url}
                alt={img.alt || product.title}
                fill
                className="object-cover"
                sizes="20vw"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>

        <div className="mt-3 text-xl font-semibold">
          {selectedVariant ? formatINR(selectedVariant.pricePaise) : "—"}
        </div>
        <div className="mt-1 text-sm text-neutral-600">
          {selectedVariant ? (selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : "Out of stock") : "Select options"}
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-neutral-600">Color</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    const firstSize = Array.from(
                      new Set(product.variants.filter((v) => v.color === c).map((v) => v.size)),
                    )[0];
                    if (firstSize) setSize(firstSize);
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                    c === color ? "bg-black text-white" : "bg-white hover:bg-neutral-100"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-neutral-600">Size</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizesForColor.map((s) => {
                const variant = product.variants.find((v) => v.color === color && v.size === s);
                const out = !variant || variant.stock <= 0;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    disabled={out}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                      s === size ? "bg-black text-white" : "bg-white hover:bg-neutral-100"
                    } ${out ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-neutral-600">Qty</div>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-9 w-9 rounded border bg-white hover:bg-neutral-100"
            >
              -
            </button>
            <div className="min-w-10 text-center text-sm font-semibold">{quantity}</div>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="h-9 w-9 rounded border bg-white hover:bg-neutral-100"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!selectedVariant) return;
              addItem(
                {
                  variantId: selectedVariant.id,
                  productId: product.id,
                  title: product.title,
                  slug: product.slug,
                  image: product.images[0]?.url,
                  size: selectedVariant.size,
                  color: selectedVariant.color,
                  pricePaise: selectedVariant.pricePaise,
                },
                quantity,
              );
            }}
            className={`mt-2 w-full rounded-xl px-5 py-3 text-sm font-semibold ${
              disabled ? "bg-neutral-200 text-neutral-500" : "bg-black text-white hover:bg-neutral-900"
            }`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

