import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/orders/:id
// Remove um lançamento (ex: usuário registrou por engano).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.order.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
