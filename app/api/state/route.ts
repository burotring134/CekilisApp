import { NextResponse } from "next/server";
import { snapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await snapshot();
  return NextResponse.json(data);
}
