import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTeamMap, saveLocation } from "@/lib/teamMap";
import { APOIO_END, APOIO_START } from "@/lib/apoioHours";
import { mapaFeature } from "@/lib/vote";

export const dynamic = "force-dynamic";

// O mapa da equipe só funciona se a equipe aprovou na votação (ver lib/vote.ts).
async function blocked() {
  const feature = await mapaFeature();
  if (feature === "approved") return null;
  return NextResponse.json(
    {
      error:
        feature === "rejected"
          ? "O mapa da equipe foi removido por decisão da equipe na votação."
          : "O mapa da equipe está desativado aguardando a aprovação dos técnicos ativos na votação.",
      feature,
    },
    { status: 403 }
  );
}

// GET /api/location -> técnicos no mapa + pedidos de SOS abertos (vazio fora do horário)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const off = await blocked();
  if (off) return off;
  return NextResponse.json(await getTeamMap(userId));
}

// POST /api/location  { lat, lng, accuracy? }
// Atualiza a posição de quem está com o app aberto. Só aceita das 07:40 às 20:00.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const off = await blocked();
  if (off) return off;

  const body = await req.json().catch(() => ({}));
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const accuracy = Number.isFinite(Number(body?.accuracy)) ? Number(body.accuracy) : null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Localização inválida" }, { status: 400 });
  }

  const saved = await saveLocation(userId, { lat, lng, accuracy });
  if (!saved) {
    return NextResponse.json(
      { error: `A localização só é compartilhada das ${APOIO_START} às ${APOIO_END}.` },
      { status: 403 }
    );
  }
  return NextResponse.json({ ok: true });
}
