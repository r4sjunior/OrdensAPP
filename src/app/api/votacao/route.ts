import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { castVote, getMapaVoteState, VoteError } from "@/lib/vote";

export const dynamic = "force-dynamic";

// GET /api/votacao -> estado da votação do mapa para quem está logado
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json(await getMapaVoteState(userId));
}

// POST /api/votacao { voto: "sim" | "nao" } -> voto secreto (não pode ser alterado)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const choice = body?.voto;
  if (choice !== "sim" && choice !== "nao") {
    return NextResponse.json({ error: "Voto inválido" }, { status: 400 });
  }
  try {
    await castVote(userId, choice);
    return NextResponse.json(await getMapaVoteState(userId));
  } catch (e) {
    if (e instanceof VoteError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("votacao", e);
    return NextResponse.json({ error: "Não foi possível registrar o voto. Tente de novo." }, { status: 500 });
  }
}
