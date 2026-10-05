import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Janela para considerar alguém conectado. O cliente envia sinal a cada 30s,
// então 70s tolera um sinal atrasado sem derrubar o usuário da contagem.
const ONLINE_WINDOW_MS = 70_000;

// POST /api/presence
// Registra que o usuário logado está com o app aberto e devolve quantos estão conectados.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const now = new Date();
  await prisma.presence.upsert({
    where: { userId },
    create: { userId, lastSeen: now },
    update: { lastSeen: now },
  });

  const online = await prisma.presence.count({
    where: { lastSeen: { gte: new Date(now.getTime() - ONLINE_WINDOW_MS) } },
  });

  return NextResponse.json({ online });
}
