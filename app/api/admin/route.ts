import { NextRequest, NextResponse } from "next/server";
import { deleteParticipant, reset } from "@/lib/store";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD || "cekilis2026";
  const provided = req.headers.get("x-admin-password") ?? "";
  return expected === provided;
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all");

  if (all === "1") {
    await reset();
    return NextResponse.json({ ok: true, action: "reset" });
  }

  if (!id) {
    return NextResponse.json({ ok: false, reason: "missing-id" }, { status: 400 });
  }
  await deleteParticipant(id);
  return NextResponse.json({ ok: true, action: "deleted", id });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
