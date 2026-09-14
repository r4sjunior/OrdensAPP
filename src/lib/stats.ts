// Calcula a média diária de ordens registradas por um usuário.
// Média = total de ordens ÷ dias corridos desde o primeiro registro até hoje.
import { prisma } from "./prisma";
import { toISODate, startOfDay } from "./dates";

export type OrderStats = {
  totalOrders: number;
  firstDate: string | null;
  daysSpan: number;
  average: number;
};

export async function getOrderStats(userId: string): Promise<OrderStats> {
  const [totalOrders, agg] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.aggregate({ where: { userId }, _min: { date: true } }),
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

  return {
    totalOrders,
    firstDate: firstDate ? toISODate(firstDate) : null,
    daysSpan,
    average: totalOrders / daysSpan,
  };
}
