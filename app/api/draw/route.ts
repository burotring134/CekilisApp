import { NextRequest, NextResponse } from "next/server";
import {
  getState,
  listParticipants,
  setSpinSeed,
  setState,
  setWinner,
} from "@/lib/store";

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

  const state = await getState();
  if (state !== "idle") {
    return NextResponse.json({ ok: false, reason: "already-drawing" }, { status: 409 });
  }

  const participants = await listParticipants();
  if (participants.length === 0) {
    return NextResponse.json({ ok: false, reason: "no-participants" }, { status: 400 });
  }

  const winnerIndex = Math.floor(Math.random() * participants.length);
  const winner = participants[winnerIndex];
  const seed = Math.random();

  await setState("drawing");
  await setSpinSeed(seed);
  await setWinner(winner);

  return NextResponse.json({ ok: true, winner, seed, winnerIndex });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  await setState("finished");
  return NextResponse.json({ ok: true });
}
