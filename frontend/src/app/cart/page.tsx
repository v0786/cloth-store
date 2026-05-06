"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import { formatINR } from "@/lib/money";

export default function CartPage() {
  const { items, itemCount, subtotalPaise, setQuantity, removeItem, clear } = useCart();

  return (
    <div className="bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Your Cart</h1>
          {itemCount ? (
            <button onClick={clear} className="rounded border px-4 py-2 text-sm hover:bg-neutral-100">
              Clear cart
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border bg-white p-8 text-center">
            <div className="text-lg font-semibold">Cart is empty</div>
            <Link href="/" className="mt-4 inline-flex rounded bg-black px-4 py-2 text-sm font-semibold text-white">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {items.map((it) => (
                <div key={it.variantId} className="flex gap-4 rounded-xl border bg-white p-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
                    {it.image ? <Image src={it.image} alt={it.title} fill className="object-cover" sizes="80px" /> : null}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{it.title}</div>
                        <div className="mt-1 text-xs text-neutral-600">
                          {it.color} · {it.size}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{formatINR(it.pricePaise * it.quantity)}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQuantity(it.variantId, it.quantity - 1)}
                          className="h-9 w-9 rounded border hover:bg-neutral-100"
                        >
                          -
                        </button>
                        <div className="min-w-10 text-center text-sm font-semibold">{it.quantity}</div>
                        <button
                          onClick={() => setQuantity(it.variantId, it.quantity + 1)}
                          className="h-9 w-9 rounded border hover:bg-neutral-100"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(it.variantId)}
                        className="rounded border px-3 py-2 text-xs font-semibold hover:bg-neutral-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-xl border bg-white p-6">
              <div className="text-lg font-semibold">Order Summary</div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-semibold">{formatINR(subtotalPaise)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-neutral-600">Delivery</span>
                <span className="font-semibold">Free</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-neutral-600">Total</span>
                <span className="text-lg font-bold">{formatINR(subtotalPaise)}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-6 inline-flex w-full justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-900"
              >
                Checkout
              </Link>
              <div className="mt-3 text-xs text-neutral-500">
                Delivery timeline: 7 days (ETA will be shown after order placement).
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

