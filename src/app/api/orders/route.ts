import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { todayISO } from "@/lib/dates";
import { campaignPhase } from "@/lib/campaign";
import { lateDatesFor } from "@/lib/lateEntries";

// POST /api/orders  { date?: "YYYY-MM-DD" }
// Cria um novo registro de ordem de serviço realizada para o usuário logado.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dateStr: string = body?.date ?? todayISO();
  const today = todayISO();

  // Guarda apenas a data (sem hora), evitando problemas de fuso.
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || isNaN(date.getTime()) || dateStr > today) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }
  // Durante a campanha os pódios valem tickets: só dá para registrar ordens de hoje,
  // a não ser nos dias que o adm liberou para este técnico (src/lib/lateEntries.ts).
  let late = false;
  if (campaignPhase(today) === "active" && dateStr !== today) {
    const user = await currentUser();
    late = lateDatesFor(user?.primaryEmailAddress?.emailAddress).includes(dateStr);
    if (!late) {
      return NextResponse.json(
        { error: "Durante a campanha só dá para registrar ordens de hoje." },
        { status: 400 }
      );
    }
  }

  const order = await prisma.order.create({
    data: { userId, date, late },
  });

  return NextResponse.json(order, { status: 201 });
}

// GET /api/orders?from=YYYY-MM-DD&to=YYYY-MM-DD
// Lista as ordens do usuário logado num intervalo (usado no extrato/histórico).
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const orders = await prisma.order.findMany({
    where: {
      userId,
      ...(from && to
        ? {
            date: {
              gte: new Date(`${from}T00:00:00.000Z`),
              lte: new Date(`${to}T00:00:00.000Z`),
            },
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(orders);
}
