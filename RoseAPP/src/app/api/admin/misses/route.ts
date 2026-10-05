import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { dismissMiss } from "@/lib/store";

export async function DELETE(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q");
  if (q) await dismissMiss(q);
  return NextResponse.json({ ok: true });
}
