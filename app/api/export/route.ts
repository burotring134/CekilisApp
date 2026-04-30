import { NextResponse } from "next/server";
import { listParticipants } from "@/lib/store";

export const dynamic = "force-dynamic";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const participants = await listParticipants();
  const header = "Sıra,Ad Soyad,Kayıt Zamanı";
  const rows = participants.map((p, idx) => {
    const ts = new Date(p.joinedAt).toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
    });
    return [idx + 1, escapeCsv(p.name), escapeCsv(ts)].join(",");
  });
  const csv = "﻿" + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cekilis-katilimcilar.csv"`,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
