import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDuration, toHelpView, whoIs } from "@/lib/apoio";
import { pushToAll } from "@/lib/push";
import { apoioWindow } from "@/lib/apoioHours";

// POST /api/apoio/:id/accept -> "VOU AJUDAR". O primeiro que tocar fica com o apoio.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Pedido aberto só vale dentro do horário de hoje (às 20:00 expira).
  const window = apoioWindow();
  if (!window.open) {
    return NextResponse.json({ error: "Fora do horário do APOIO DROP: o pedido expirou." }, { status: 409 });
  }

  const { name: helperName } = await whoIs(userId);
  const now = new Date();
  const updated = await prisma.helpRequest.updateMany({
    where: {
      id: params.id,
      acceptedAt: null,
      cancelledAt: null,
      userId: { not: userId },
      createdAt: { gte: new Date(window.start) },
    },
    data: { acceptedAt: now, acceptedById: userId, acceptedByName: helperName },
  });
  const request = await prisma.helpRequest.findUnique({ where: { id: params.id } });
  if (!request) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if (updated.count === 0) {
    const msg = request.cancelledAt
      ? "Esse pedido foi cancelado."
      : request.acceptedByName
        ? `${request.acceptedByName} já está indo ajudar.`
        : request.userId === userId
          ? "Você não pode aceitar o próprio pedido."
          : "Esse pedido expirou.";
    return NextResponse.json({ error: msg, request: toHelpView(request, userId) }, { status: 409 });
  }

  // Mesma tag: substitui a notificação do pedido no celular de todo mundo.
  const waited = formatDuration(now.getTime() - request.createdAt.getTime());
  await pushToAll({
    title: "✅ AJUDA A CAMINHO!",
    body: `${helperName} vai apoiar ${request.name}. Ficou ${waited} em aberto.`,
    tag: `apoio-${request.id}`,
    url: "/dashboard",
  });

  return NextResponse.json(toHelpView(request, userId));
}
