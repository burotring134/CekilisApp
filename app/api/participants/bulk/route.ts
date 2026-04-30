import { NextRequest, NextResponse } from "next/server";
import { addParticipantsBulk, type Participant } from "@/lib/store";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "cekilis2026";
  const provided = req.headers.get("x-admin-password") ?? "";
  return expected === provided;
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let body: { names?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid-json" }, { status: 400 });
  }

  const rawNames = (body.names ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0 && s.length <= 80);

  if (rawNames.length === 0) {
    return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });
  }
  if (rawNames.length > 500) {
    return NextResponse.json({ ok: false, reason: "too-many" }, { status: 400 });
  }

  const now = Date.now();
  const participants: Participant[] = rawNames.map((name, i) => ({
    id: crypto.randomUUID(),
    name,
    joinedAt: now + i,
  }));

  const result = await addParticipantsBulk(participants);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });
  }
  return NextResponse.json({ ok: true, added: result.added });
}
