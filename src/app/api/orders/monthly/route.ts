import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/dates";

// GET /api/orders/monthly
// Histórico mês a mês do usuário logado: total de ordens, dias trabalhados e
// média de ordens por dia trabalhado. Ordenado do mês mais recente ao mais antigo.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const groups = await prisma.order.groupBy({
    by: ["date"],
    where: { userId },
    _count: { _all: true },
  });

  const byMonth = new Map<string, { total: number; workedDays: number }>();
  for (const g of groups) {
    const month = toISODate(new Date(g.date)).slice(0, 7); // YYYY-MM
    const cur = byMonth.get(month) ?? { total: 0, workedDays: 0 };
    cur.total += g._count._all;
    cur.workedDays += 1;
    byMonth.set(month, cur);
  }

  const months = Array.from(byMonth, ([month, m]) => ({
    month,
    total: m.total,
    workedDays: m.workedDays,
    average: m.workedDays > 0 ? m.total / m.workedDays : 0,
  })).sort((a, b) => b.month.localeCompare(a.month));

  return NextResponse.json({ months });
}
