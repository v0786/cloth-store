import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";

export async function GET() {
  const started = Date.now();
  let ok = false;
  try {
    await getFirestore().listCollections();
    ok = true;
  } catch {
    ok = false;
  }

  return NextResponse.json({
    ok,
    db: ok ? "up" : "down",
    uptimeSec: Math.round(process.uptime()),
    responseMs: Date.now() - started,
  });
}
