import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getDailyRanking,
  getGeneralRanking,
  getMonthlyRanking,
  getWeeklyRanking,
} from "@/lib/ranking";
import { today } from "@/lib/dates";

// GET /api/orders/ranking?type=daily&date=YYYY-MM-DD           -> top 3 do dia de `date`
// GET /api/orders/ranking?type=weekly&date=YYYY-MM-DD          -> top 3 da semana (dom–sáb) de `date`
// GET /api/orders/ranking?type=monthly&date=YYYY-MM-DD[&top=3] -> ranking do mês de `date`
// GET /api/orders/ranking?type=general                         -> todos os usuários, desde o início
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

  if (type !== "daily" && type !== "weekly" && type !== "monthly") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const dateParam = searchParams.get("date") ?? "";
  const reference = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? new Date(`${dateParam}T00:00:00.000Z`)
    : today();
  if (Number.isNaN(reference.getTime())) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  if (type === "daily") {
    return NextResponse.json({ entries: await getDailyRanking(userId, reference) });
  }
  if (type === "weekly") {
    return NextResponse.json({ entries: await getWeeklyRanking(userId, reference) });
  }

  const top = Number(searchParams.get("top"));
  const take = Number.isInteger(top) && top > 0 ? top : undefined;
  return NextResponse.json({ entries: await getMonthlyRanking(userId, reference, take) });
}
