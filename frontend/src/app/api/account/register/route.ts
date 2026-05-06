import { NextResponse } from "next/server";
import { z } from "zod";
import { registerUser } from "@/lib/store/users";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const res = await registerUser({
    email: parsed.data.email,
    password: parsed.data.password,
    name: parsed.data.name || null,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });

  return NextResponse.json({ ok: true });
}
