import { NextRequest, NextResponse } from "next/server";
import {
  getFinishedAt,
  getParticipantCount,
  getSpinSeed,
  getState,
  getWinner,
  snapshot,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const light = searchParams.get("light") === "1";
  if (light) {
    const [state, participantCount, winner, spinSeed, finishedAt] = await Promise.all([
      getState(),
      getParticipantCount(),
      getWinner(),
      getSpinSeed(),
      getFinishedAt(),
    ]);
    return NextResponse.json({
      state,
      participantCount,
      winner,
      spinSeed,
      finishedAt,
    });
  }
  const data = await snapshot();
  return NextResponse.json(data);
}
