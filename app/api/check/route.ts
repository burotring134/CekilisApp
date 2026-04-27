import { NextRequest, NextResponse } from "next/server";
import { isFingerprintRegistered, getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fingerprint = (searchParams.get("fingerprint") ?? "").trim();
  if (!fingerprint || fingerprint.length < 8) {
    return NextResponse.json({ ok: false, reason: "missing-fingerprint" }, { status: 400 });
  }
  const [registered, state] = await Promise.all([
    isFingerprintRegistered(fingerprint),
    getState(),
  ]);
  return NextResponse.json({ registered, state });
}
