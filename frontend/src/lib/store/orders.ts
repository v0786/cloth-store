import { getFirestore } from "@/lib/firebaseAdmin";

export type TrackingEvent = {
  status: string;
  note?: string | null;
  createdAt: number;
};

export type OrderItem = {
  productId: string;
  variantId: string;
  title: string;
  slug: string;
  imageUrl?: string | null;
  size: string;
  color: string;
  pricePaise: number;
  quantity: number;
};

export type Order = {
  id: string;
  userId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  pincode: string;
  paymentMethod: string;
  status: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyApp: boolean;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  etaDate: number;
  createdAt: number;
  updatedAt: number;
  items: OrderItem[];
  tracking: TrackingEvent[];
};

function ordersCol() {
  return getFirestore().collection("orders");
}

export async function createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">) {
  const now = Date.now();
  const ref = ordersCol().doc();
  const order: Order = {
    ...data,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(order);
  return order;
}

export async function getOrderById(id: string) {
  const snap = await ordersCol().doc(id).get();
  return snap.exists ? (snap.data() as Order) : null;
}

export async function listRecentOrders(limit = 500) {
  const snap = await ordersCol().orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as Order);
}

