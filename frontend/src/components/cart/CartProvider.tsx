"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  variantId: string;
  productId: string;
  title: string;
  slug: string;
  image?: string;
  size: string;
  color: string;
  pricePaise: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalPaise: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "clothing_store_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({ items: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartState;
      if (parsed && Array.isArray(parsed.items)) {
        setState({ items: parsed.items });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((sum, it) => sum + it.quantity, 0);
    const subtotalPaise = state.items.reduce((sum, it) => sum + it.pricePaise * it.quantity, 0);

    const addItem: CartContextValue["addItem"] = (item, quantity = 1) => {
      setState((prev) => {
        const existing = prev.items.find((i) => i.variantId === item.variantId);
        if (existing) {
          return {
            items: prev.items.map((i) =>
              i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i
            ),
          };
        }
        return { items: [...prev.items, { ...item, quantity }] };
      });
    };

    const removeItem: CartContextValue["removeItem"] = (variantId) => {
      setState((prev) => ({ items: prev.items.filter((i) => i.variantId !== variantId) }));
    };

    const setQuantity: CartContextValue["setQuantity"] = (variantId, quantity) => {
      setState((prev) => {
        if (quantity <= 0) return { items: prev.items.filter((i) => i.variantId !== variantId) };
        return { items: prev.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)) };
      });
    };

    const clear = () => setState({ items: [] });

    return {
      items: state.items,
      itemCount,
      subtotalPaise,
      addItem,
      removeItem,
      setQuantity,
      clear,
    };
  }, [state.items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

