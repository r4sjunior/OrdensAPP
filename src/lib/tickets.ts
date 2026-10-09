// Tickets da campanha "Caixinha de Gela", calculados a partir das ordens (nada é
// guardado à parte, então apagar uma ordem também tira o ticket dela).
//
// - Só contam ordens com data dentro da campanha e registradas no próprio dia
//   (data da ordem = dia do createdAt em Brasília): registro retroativo não vale.
// - Bônus do 1º lugar só entra quando o período fecha (dia, semana sáb–sex ou mês,
//   cortados no fim da campanha). Empate: todos os empatados ganham.
import { prisma } from "./prisma";
import { BONUS, CAMPAIGN, campaignPhase, luckWeight, type CampaignPhase } from "./campaign";
import { addDays, endOfMonth, isoInAppTZ, startOfWeek, toISODate, todayISO } from "./dates";

export type TicketOrder = {
  userId: string;
  date: string; // YYYY-MM-DD
  createdDay: string; // YYYY-MM-DD em Brasília
};

export type TicketBreakdown = {
  orders: number;
  dailyWins: number;
  weeklyWins: number;
  monthlyWins: number;
  earned: number;
};

function emptyBreakdown(): TicketBreakdown {
  return { orders: 0, dailyWins: 0, weeklyWins: 0, monthlyWins: 0, earned: 0 };
}

function minISO(a: string, b: string) {
  return a < b ? a : b;
}

// Agrupa contagens por período e dá `win` a quem ficou em 1º nos períodos já fechados.
function awardFirstPlaces(
  counts: Map<string, Map<string, number>>, // dia -> usuário -> ordens
  periodOf: (day: string) => { key: string; end: string },
  today: string,
  win: (userId: string) => void
) {
  const periods = new Map<string, { end: string; totals: Map<string, number> }>();
  counts.forEach((byUser, day) => {
    const { key, end } = periodOf(day);
    const p = periods.get(key) ?? { end, totals: new Map<string, number>() };
    byUser.forEach((n, userId) => p.totals.set(userId, (p.totals.get(userId) ?? 0) + n));
    periods.set(key, p);
  });

  periods.forEach(({ end, totals }) => {
    if (end >= today) return; // período ainda aberto
    const max = Math.max(0, ...Array.from(totals.values()));
    if (max === 0) return;
    totals.forEach((n, userId) => {
      if (n === max) win(userId);
    });
  });
}

// Parte pura (sem banco), para dar para testar com dados de exemplo.
export function computeTickets(orders: TicketOrder[], today: string): Map<string, TicketBreakdown> {
  const result = new Map<string, TicketBreakdown>();
  const get = (userId: string) => {
    let b = result.get(userId);
    if (!b) {
      b = emptyBreakdown();
      result.set(userId, b);
    }
    return b;
  };

  const counts = new Map<string, Map<string, number>>();
  for (const o of orders) {
    if (o.date < CAMPAIGN.start || o.date > CAMPAIGN.end || o.date > today) continue;
    if (o.createdDay !== o.date) continue;
    const byUser = counts.get(o.date) ?? new Map<string, number>();
    byUser.set(o.userId, (byUser.get(o.userId) ?? 0) + 1);
    counts.set(o.date, byUser);
    get(o.userId).orders += 1;
  }

  awardFirstPlaces(counts, (day) => ({ key: day, end: day }), today, (u) => {
    get(u).dailyWins += 1;
  });

  awardFirstPlaces(
    counts,
    (day) => {
      const start = startOfWeek(new Date(`${day}T00:00:00.000Z`));
      const key = toISODate(start);
      return { key, end: minISO(toISODate(addDays(start, 6)), CAMPAIGN.end) };
    },
    today,
    (u) => {
      get(u).weeklyWins += 1;
    }
  );

  awardFirstPlaces(
    counts,
    (day) => ({
      key: day.slice(0, 7),
      end: minISO(toISODate(endOfMonth(new Date(`${day}T00:00:00.000Z`))), CAMPAIGN.end),
    }),
    today,
    (u) => {
      get(u).monthlyWins += 1;
    }
  );

  result.forEach((b) => {
    b.earned =
      b.orders +
      b.dailyWins * BONUS.daily +
      b.weeklyWins * BONUS.weekly +
      b.monthlyWins * BONUS.monthly;
  });
  return result;
}

// Tickets de todos os usuários (os pódios dependem das ordens de todo mundo).
export async function getAllTickets(today: string = todayISO()) {
  const orders = await prisma.order.findMany({
    where: {
      date: {
        gte: new Date(`${CAMPAIGN.start}T00:00:00.000Z`),
        lte: new Date(`${CAMPAIGN.end}T00:00:00.000Z`),
      },
    },
    select: { userId: true, date: true, createdAt: true },
  });
  return computeTickets(
    orders.map((o) => ({
      userId: o.userId,
      date: toISODate(o.date),
      createdDay: isoInAppTZ(o.createdAt),
    })),
    today
  );
}

export type MyCampaign = {
  phase: CampaignPhase;
  start: string;
  end: string;
  bonus: typeof BONUS;
  tickets: TicketBreakdown;
  deposited: number;
  // Se o usuário apagou ordens depois de depositar, só vale o que ele ainda tem.
  effective: number;
  available: number;
  weight: number;
};

export async function getMyCampaign(userId: string): Promise<MyCampaign> {
  const today = todayISO();
  const [all, deposit] = await Promise.all([
    getAllTickets(today),
    prisma.luckDeposit.findUnique({ where: { userId } }),
  ]);
  const tickets = all.get(userId) ?? emptyBreakdown();
  const deposited = deposit?.amount ?? 0;
  const effective = Math.min(deposited, tickets.earned);
  return {
    phase: campaignPhase(today),
    start: CAMPAIGN.start,
    end: CAMPAIGN.end,
    bonus: BONUS,
    tickets,
    deposited,
    effective,
    available: Math.max(0, tickets.earned - deposited),
    weight: luckWeight(effective),
  };
}
