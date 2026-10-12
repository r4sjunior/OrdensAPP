import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { pushToAll } from "@/lib/push";
import { publishApoio } from "@/lib/realtime";

// POST /api/apoio/:id/cancel -> quem pediu cancela (resolveu sozinho, alarme falso).
// O registro continua guardado.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const updated = await prisma.helpRequest.updateMany({
    where: { id: params.id, userId, acceptedAt: null, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Pedido não está mais aberto." }, { status: 409 });
  }

  await publishApoio({ type: "cancelled", id: params.id });
  const request = await prisma.helpRequest.findUnique({ where: { id: params.id } });
  await pushToAll(
    {
      title: "APOIO DROP cancelado",
      body: `${request?.name ?? "O técnico"} não precisa mais de apoio.`,
      tag: `apoio-${params.id}`,
      url: "/dashboard",
      silent: true,
      kind: "apoio-cancelled",
      requestId: params.id,
    },
    userId
  );
  return NextResponse.json({ ok: true });
}
