import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrderStats } from "@/lib/stats";

// GET /api/orders/stats
// Retorna o total geral de ordens e a média diária do usuário logado.
// Recalculado sob demanda, então reflete imediatamente cada novo registro.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const stats = await getOrderStats(userId);
  return NextResponse.json(stats);
}
