// Números do mês atual de um usuário (zeram na virada do mês, no fuso de Brasília).
// Média = ordens do mês ÷ dias trabalhados no mês (dias com pelo menos 1 ordem),
// ignorando dias sem nenhum registro. Meses anteriores ficam no histórico mensal.
import { prisma } from "./prisma";
import { toISODate, startOfDay, today, startOfMonth, endOfMonth } from "./dates";

export type OrderStats = {
  totalOrders: number;
  firstDate: string | null;
  daysSpan: number;
  workedDays: number;
  average: number;
};

export async function getOrderStats(userId: string): Promise<OrderStats> {
  const now = today();
  const where = { userId, date: { gte: startOfMonth(now), lte: endOfMonth(now) } };
  const [totalOrders, agg, distinctDays] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({ where, _min: { date: true } }),
    // Dias trabalhados = dias distintos do mês em que pelo menos 1 ordem foi registrada.
    prisma.order.findMany({
      where,
      distinct: ["date"],
      select: { date: true },
    }),
  ]);

  const firstDate = agg._min.date;
  let daysSpan = 1;
  if (firstDate) {
    const start = startOfDay(firstDate);
    const end = now;
    daysSpan = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    );
  }

  const workedDays = distinctDays.length;

  return {
    totalOrders,
    firstDate: firstDate ? toISODate(firstDate) : null,
    daysSpan,
    workedDays,
    average: workedDays > 0 ? totalOrders / workedDays : 0,
  };
}
