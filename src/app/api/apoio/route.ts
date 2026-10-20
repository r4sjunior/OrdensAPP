import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { listActiveHelp, toHelpView, whoIs } from "@/lib/apoio";
import { pushToAll } from "@/lib/push";
import { reverseGeocode } from "@/lib/geocode";
import { publishApoio } from "@/lib/realtime";
import { APOIO_END, APOIO_START, apoioWindow } from "@/lib/apoioHours";

export const dynamic = "force-dynamic";

// GET /api/apoio -> pedidos abertos e atendidos há pouco
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.json({ requests: await listActiveHelp(userId), serverNow: Date.now() });
}

// POST /api/apoio  { lat, lng, accuracy? }
// Pede APOIO DROP: todos recebem o alerta com a localização.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!apoioWindow().open) {
    return NextResponse.json(
      { error: `O APOIO DROP funciona todos os dias das ${APOIO_START} às ${APOIO_END}.` },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const accuracy = Number.isFinite(Number(body?.accuracy)) ? Number(body.accuracy) : null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Localização inválida" }, { status: 400 });
  }

  const open = await prisma.helpRequest.findFirst({
    where: { userId, acceptedAt: null, cancelledAt: null, createdAt: { gte: new Date(apoioWindow().start) } },
  });
  if (open) {
    return NextResponse.json({ error: "Você já tem um pedido de apoio aberto." }, { status: 409 });
  }

  const [{ name, imageUrl }, place] = await Promise.all([whoIs(userId), reverseGeocode(lat, lng)]);
  const created = await prisma.helpRequest.create({
    data: { userId, name, imageUrl, lat, lng, accuracy, ...place },
  });
  const where = [place.bairro, place.address].filter(Boolean).join(" · ");

  // Telas abertas atualizam na hora; o push cobre quem está com o app fechado.
  await publishApoio({ type: "created", id: created.id });
  await pushToAll(
    {
      title: place.bairro ? `🆘 SOS DROP · ${place.bairro.toUpperCase()}` : "🆘 SOS DROP",
      body: where ? `${name} pediu apoio!\n📍 ${where}` : `${name} pediu apoio! Toque para ver a localização.`,
      image: `/api/apoio/${created.id}/card`,
      tag: `apoio-${created.id}`,
      url: "/dashboard",
      urgent: true,
      kind: "apoio-created",
      requestId: created.id,
      lat,
      lng,
    },
    userId
  );

  return NextResponse.json(toHelpView(created, userId), { status: 201 });
}
