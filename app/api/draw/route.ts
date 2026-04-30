import { NextRequest, NextResponse } from "next/server";
import {
  addPastWinnerId,
  getPastWinnerIds,
  getState,
  listParticipants,
  setSpinSeed,
  setState,
  setWinner,
  getWinner,
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

  const [participants, pastIds] = await Promise.all([
    listParticipants(),
    getPastWinnerIds(),
  ]);
  const pastSet = new Set(pastIds);
  const eligible = participants.filter((p) => !pastSet.has(p.id));

  if (eligible.length === 0) {
    return NextResponse.json({ ok: false, reason: "no-eligible" }, { status: 400 });
  }

  const winnerIndex = Math.floor(Math.random() * eligible.length);
  const winner = eligible[winnerIndex];
  const seed = Math.random();

  await setState("drawing");
  await setSpinSeed(seed);
  await setWinner(winner);

  return NextResponse.json({ ok: true, winner, seed, eligibleCount: eligible.length });
}

export async function PATCH() {
  // No admin auth — this only flips the UI state to reveal a winner that
  // was already chosen server-side at POST time. Auto-called by the
  // projector display when the wheel animation finishes.
  const state = await getState();
  if (state !== "drawing") {
    return NextResponse.json({ ok: false, reason: "not-drawing" }, { status: 409 });
  }
  await setState("finished");
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const state = await getState();
  if (state !== "finished") {
    return NextResponse.json({ ok: false, reason: "not-finished" }, { status: 409 });
  }

  const winner = await getWinner();
  if (winner) await addPastWinnerId(winner.id);

  await setWinner(null);
  await setSpinSeed(null);
  await setState("idle");

  return NextResponse.json({ ok: true });
}
