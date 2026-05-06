import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/store/orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = (searchParams.get("orderId") || "").trim();
  const phone = (searchParams.get("phone") || "").trim();

  if (!orderId || !phone) {
    return NextResponse.json({ error: "Missing orderId or phone" }, { status: 400 });
  }

  const order = await getOrderById(orderId);

  if (!order || order.customerPhone !== phone) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    etaDate: new Date(order.etaDate),
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    tracking: (order.tracking || []).map((t) => ({ status: t.status, note: t.note, createdAt: new Date(t.createdAt) })),
    items: order.items.map((i) => ({
      title: i.title,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
    })),
  });
}
