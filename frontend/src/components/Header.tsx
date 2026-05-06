"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "@/components/cart/CartProvider";

export default function Header() {
  const { data } = useSession();
  const { itemCount } = useCart();
  const role = (data?.user as any)?.role as string | undefined;
  const canSeeAdmin = role === "ADMIN" || role === "MANAGER" || role === "VIEWER";

  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Clothing Store
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/track" className="hover:underline">
            Track Order
          </Link>
          <Link href="/cart" className="hover:underline">
            Cart ({itemCount})
          </Link>
          {data?.user ? (
            <>
              {canSeeAdmin ? (
                <Link href="/admin" className="hover:underline">
                  Dashboard
                </Link>
              ) : null}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded border px-3 py-1.5 hover:bg-black hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/account/login" className="rounded border px-3 py-1.5 hover:bg-black hover:text-white">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
