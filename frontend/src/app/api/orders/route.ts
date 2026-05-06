import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireAdmin } from "@/lib/permissions";
import { createOrder, listRecentOrders } from "@/lib/store/orders";

const ItemSchema = z.object({
  variantId: z.string(),
  productId: z.string(),
  title: z.string(),
  slug: z.string(),
  image: z.string().optional().nullable(),
  size: z.string(),
  color: z.string(),
  pricePaise: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

const CreateSchema = z.object({
  customerName: z.string().min(1).max(80),
  customerPhone: z.string().min(7).max(20),
  customerEmail: z.string().email().optional().nullable(),
  addressLine1: z.string().min(3).max(120),
  addressLine2: z.string().max(120).optional().nullable(),
  city: z.string().min(2).max(60),
  state: z.string().max(60).optional().nullable(),
  pincode: z.string().min(4).max(10),
  paymentMethod: z.enum(["COD", "UPI", "CARD", "RAZORPAY"]),
  notifyEmail: z.boolean().default(true),
  notifySms: z.boolean().default(false),
  notifyApp: z.boolean().default(true),
  items: z.array(ItemSchema).min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const session = await getSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const etaDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const data = parsed.data;

  const order = await createOrder({
    userId: userId || null,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerEmail: data.customerEmail || null,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2 || null,
    city: data.city,
    state: data.state || null,
    pincode: data.pincode,
    paymentMethod: data.paymentMethod,
    status: "PLACED",
    notifyEmail: data.notifyEmail,
    notifySms: data.notifySms,
    notifyApp: data.notifyApp,
    trackingNumber: null,
    trackingUrl: null,
    etaDate,
    items: data.items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId,
      title: it.title,
      slug: it.slug,
      imageUrl: it.image || null,
      size: it.size,
      color: it.color,
      pricePaise: it.pricePaise,
      quantity: it.quantity,
    })),
    tracking: [{ status: "PLACED", note: "Order placed", createdAt: Date.now() }],
  });

  return NextResponse.json({ id: order.id, etaDate: new Date(order.etaDate) });
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await listRecentOrders(500);

  return NextResponse.json(orders);
}
