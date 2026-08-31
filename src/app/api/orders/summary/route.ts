import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  toISODate,
} from "@/lib/dates";

// GET /api/orders/summary?period=daily|weekly|monthly&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "daily";
  const dateParam = searchParams.get("date");
  const ref = dateParam ? new Date(`${dateParam}T00:00:00.000Z`) : new Date();

  let rangeStart: Date;
  let rangeEnd: Date;

  if (period === "weekly") {
    rangeStart = startOfWeek(ref);
    rangeEnd = endOfWeek(ref);
  } else if (period === "monthly") {
    rangeStart = startOfMonth(ref);
    rangeEnd = endOfMonth(ref);
  } else {
    // daily: mostra os últimos 7 dias terminando no dia de referência,
    // para dar contexto de tendência, mas o "total" é só o dia escolhido.
    rangeEnd = ref;
    rangeStart = addDays(ref, -6);
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      date: { gte: rangeStart, lte: rangeEnd },
    },
    select: { date: true },
  });

  const countsByDate = new Map<string, number>();
  for (const o of orders) {
    const key = toISODate(new Date(o.date));
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const breakdown: { date: string; count: number }[] = [];
  let cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const key = toISODate(cursor);
    breakdown.push({ date: key, count: countsByDate.get(key) ?? 0 });
    cursor = addDays(cursor, 1);
  }

  const total =
    period === "daily"
      ? countsByDate.get(toISODate(ref)) ?? 0
      : breakdown.reduce((sum, d) => sum + d.count, 0);

  return NextResponse.json({
    period,
    referenceDate: toISODate(ref),
    rangeStart: toISODate(rangeStart),
    rangeEnd: toISODate(rangeEnd),
    total,
    breakdown,
  });
}
