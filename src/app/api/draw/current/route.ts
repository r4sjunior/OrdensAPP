import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdm } from "@/lib/adm";
import { prisma } from "@/lib/prisma";
import { getOpenDraw, toView } from "@/lib/draw";

export const dynamic = "force-dynamic";

// GET /api/draw/current[?id=...]
// Sorteio que está na tela (para a roleta ao vivo). Logado com Google ou no /adm.
// Sorteios de teste só para o /adm.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const adm = isAdm();
  if (!userId && !adm) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const draw = id
    ? await prisma.draw.findUnique({ where: { id } })
    : await getOpenDraw(adm);
  if (!draw || (draw.test && !adm)) {
    return NextResponse.json({ draw: null, serverNow: Date.now() });
  }
  return NextResponse.json({ draw: toView(draw, userId), serverNow: Date.now() });
}
