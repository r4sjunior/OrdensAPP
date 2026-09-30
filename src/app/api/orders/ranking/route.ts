import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGeneralRanking, getWeeklyRanking } from "@/lib/ranking";

// GET /api/orders/ranking?type=weekly&date=YYYY-MM-DD  -> top 3 da semana de `date`
// GET /api/orders/ranking?type=general                 -> todos os usuários
// Retorna só posição e nº de ordens (nunca ids nem e-mails).
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "general") {
    return NextResponse.json({ entries: await getGeneralRanking(userId) });
  }

  if (type === "weekly") {
    const dateParam = searchParams.get("date") ?? "";
    const reference = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? new Date(`${dateParam}T00:00:00.000Z`)
      : new Date();
    if (Number.isNaN(reference.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    return NextResponse.json({ entries: await getWeeklyRanking(userId, reference) });
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
}
