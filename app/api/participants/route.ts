import { NextRequest, NextResponse } from "next/server";
import { addParticipant, listParticipants, type Participant } from "@/lib/store";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

export async function GET() {
  const participants = await listParticipants();
  return NextResponse.json({ participants });
}

export async function POST(req: NextRequest) {
  let body: { name?: string; surname?: string; fingerprint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid-json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const surname = (body.surname ?? "").trim();
  const fingerprint = (body.fingerprint ?? "").trim();

  if (!name || !surname) {
    return NextResponse.json({ ok: false, reason: "missing-name" }, { status: 400 });
  }
  if (name.length > 40 || surname.length > 40) {
    return NextResponse.json({ ok: false, reason: "name-too-long" }, { status: 400 });
  }
  if (!fingerprint || fingerprint.length < 8) {
    return NextResponse.json({ ok: false, reason: "missing-fingerprint" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const participant: Participant = {
    id: crypto.randomUUID(),
    name: `${name} ${surname}`,
    joinedAt: Date.now(),
  };

  const result = await addParticipant(participant, fingerprint, ip);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });
  }
  return NextResponse.json({ ok: true, participant });
}
