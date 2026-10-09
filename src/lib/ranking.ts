// Rankings: expõe a quantidade de ordens por usuário, nunca o userId. Além de `isMe`
// (para o usuário logado reconhecer a própria posição), só vai o avatar de quem
// adicionou foto em /perfil; quem não adicionou fica sem (ícone neutro na tela).
import { prisma } from "./prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay } from "./dates";

export type RankingEntry = {
  position: number;
  orders: number;
  isMe: boolean;
  avatarUrl: string | null;
};

async function countByUser(
  currentUserId: string,
  where: { date?: { gte: Date; lte: Date } },
  take?: number
): Promise<RankingEntry[]> {
  const groups = await prisma.order.groupBy({
    by: ["userId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
    ...(take ? { take } : {}),
  });

  const profiles = await prisma.profile.findMany({
    where: { userId: { in: groups.map((g) => g.userId) } },
  });
  const avatars = new Map(profiles.map((p) => [p.userId, p.avatarUrl]));

  return groups.map((g, i) => ({
    position: i + 1,
    orders: g._count._all,
    isMe: g.userId === currentUserId,
    avatarUrl: avatars.get(g.userId) ?? null,
  }));
}

// Top 3 do dia `reference` (zera todo dia às 0:00).
export function getDailyRanking(currentUserId: string, reference: Date) {
  const day = startOfDay(reference);
  return countByUser(currentUserId, { date: { gte: day, lte: day } }, 3);
}

// Top 3 da semana (sábado a sexta) que contém `reference`.
export function getWeeklyRanking(currentUserId: string, reference: Date) {
  return countByUser(
    currentUserId,
    { date: { gte: startOfWeek(reference), lte: endOfWeek(reference) } },
    3
  );
}

// Ranking do mês que contém `reference` (zera todo dia 1º). `take` limita ao top N.
export function getMonthlyRanking(currentUserId: string, reference: Date, take?: number) {
  return countByUser(
    currentUserId,
    { date: { gte: startOfMonth(reference), lte: endOfMonth(reference) } },
    take
  );
}

// Todos os usuários, desde o início.
export function getGeneralRanking(currentUserId: string) {
  return countByUser(currentUserId, {});
}
