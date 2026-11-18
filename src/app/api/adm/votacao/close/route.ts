import { NextResponse } from "next/server";
import { isAdm } from "@/lib/adm";
import { closeVoteByAdm, VoteError } from "@/lib/vote";

export const dynamic = "force-dynamic";

// POST /api/adm/votacao/close -> encerra a votação do mapa com os votos que já entraram
export async function POST() {
  if (!isAdm()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    await closeVoteByAdm();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof VoteError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("votacao/close", e);
    return NextResponse.json({ error: "Não foi possível encerrar." }, { status: 500 });
  }
}
