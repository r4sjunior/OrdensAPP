import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTeamMap, saveLocation } from "@/lib/teamMap";
import { APOIO_END, APOIO_START } from "@/lib/apoioHours";

export const dynamic = "force-dynamic";

// GET /api/location -> técnicos no mapa + pedidos de SOS abertos (vazio fora do horário)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.json(await getTeamMap(userId));
}

// POST /api/location  { lat, lng, accuracy? }
// Atualiza a posição de quem está com o app aberto. Só aceita das 07:40 às 20:00.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

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
