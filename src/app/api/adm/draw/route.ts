import { NextRequest, NextResponse } from "next/server";
import { isAdm } from "@/lib/adm";
import { createDraw, getOpenDraw, toView } from "@/lib/draw";

// POST /api/adm/draw  { test?: boolean }
// VALENDO: sorteia o vencedor agora; a roleta gira para todos 2 minutos depois.
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
    return NextResponse.json(toView(draw, null), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
