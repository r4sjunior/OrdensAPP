import { NextRequest, NextResponse } from "next/server";
import { isAdm } from "@/lib/adm";
import { prisma } from "@/lib/prisma";

// POST /api/adm/draw/close  { id }
// Tira o sorteio da tela de todos. O registro continua guardado no histórico.
export async function POST(req: NextRequest) {
  if (!isAdm()) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");

  const updated = await prisma.draw.updateMany({
    where: { id, closedAt: null },
    data: { closedAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Sorteio não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
