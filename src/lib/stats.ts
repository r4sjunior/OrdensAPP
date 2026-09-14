// Calcula a média geral de ordens por dia de um usuário (não é a contagem de hoje).
// Média = total geral de ordens já registradas ÷ dias trabalhados (dias com pelo menos 1 ordem),
// ignorando dias sem nenhum registro no meio do período.
import { prisma } from "./prisma";
import { toISODate, startOfDay } from "./dates";

export type OrderStats = {
  totalOrders: number;
  firstDate: string | null;
  daysSpan: number;
  workedDays: number;
  average: number;
};

export async function getOrderStats(userId: string): Promise<OrderStats> {
  const [totalOrders, agg, distinctDays] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.aggregate({ where: { userId }, _min: { date: true } }),
    // Dias trabalhados = dias distintos em que pelo menos 1 ordem foi registrada.
    prisma.order.findMany({
      where: { userId },
      distinct: ["date"],
      select: { date: true },
    }),
  ]);

  const firstDate = agg._min.date;
  let daysSpan = 1;
  if (firstDate) {
    const start = startOfDay(firstDate);
    const end = startOfDay(new Date());
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
