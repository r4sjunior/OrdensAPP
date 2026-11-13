import { NextRequest, NextResponse } from "next/server";
import { isAdm } from "@/lib/adm";
import { createDraw, getOpenDraw, toView } from "@/lib/draw";
import { pushToAll } from "@/lib/push";

// POST /api/adm/draw  { test?: boolean }
// VALENDO: sorteia o vencedor agora; a roleta gira para todos 2 minutos depois.
// No sorteio valendo (não no teste) manda push para todo mundo que ativou as
// notificações, para quem está com o app fechado abrir a tempo da contagem.
export async function POST(req: NextRequest) {
  if (!isAdm()) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const test = body?.test === true;

  const open = await getOpenDraw(true);
  if (open) {
    return NextResponse.json(
      { error: "Já existe um sorteio na tela. Encerre ele antes de fazer outro." },
      { status: 409 }
    );
  }

  try {
    const draw = await createDraw(test);
    let pushed = 0;
    if (!test) {
      // Falha no push não pode atrapalhar o sorteio, que já está gravado.
      pushed = await pushToAll({
        title: "🍺 Sorteio da Caixinha de Gela!",
        body: "A roleta gira em 2 minutos. Abra o app para assistir ao vivo!",
        tag: "sorteio",
        url: "/dashboard",
        urgent: true,
        kind: "sorteio",
        badge: "/badge-gela",
      }).catch(() => 0);
    }
    return NextResponse.json({ ...toView(draw, null), pushed }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
