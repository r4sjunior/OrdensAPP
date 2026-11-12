import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { campaignPhase } from "@/lib/campaign";
import { getMyCampaign } from "@/lib/tickets";

// POST /api/campaign/deposit  { amount: number }
// Deposita tickets como sorte no sorteio. Não dá para desfazer.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 });
  }
  // Tickets só podem ser usados durante a campanha (01/11 a 11/12).
  const phase = campaignPhase();
  if (phase === "before") {
    return NextResponse.json({ error: "A campanha ainda não começou." }, { status: 400 });
  }
  if (phase === "ended") {
    return NextResponse.json({ error: "Os depósitos de sorte já encerraram." }, { status: 400 });
  }

  const { tickets } = await getMyCampaign(userId);

  // Soma só se o total depositado continuar <= tickets ganhos. Feito num único
  // UPDATE condicional para dois cliques seguidos não depositarem além do saldo.
  await prisma.luckDeposit.upsert({
    where: { userId },
    create: { userId, amount: 0 },
    update: {},
  });
  const updated = await prisma.luckDeposit.updateMany({
    where: { userId, amount: { lte: tickets.earned - amount } },
    data: { amount: { increment: amount } },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Você não tem tickets suficientes." }, { status: 400 });
  }

  return NextResponse.json(await getMyCampaign(userId));
}
