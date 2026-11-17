// Mapa da equipe: última localização de cada técnico, só no horário do SOS DROP
// (07:40–20:00, Brasília). Fora do horário nada é gravado nem devolvido.
import { prisma } from "./prisma";
import { LOCATION_MAX_AGE_MS, apoioWindow } from "./apoioHours";
import { listActiveHelp, whoIs, type HelpView } from "./apoio";

export type TeamMember = {
  userId: string;
  name: string;
  imageUrl: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: number; // epoch ms
  isMe: boolean;
};

export type TeamMapData = {
  open: boolean;
  start: number;
  end: number;
  serverNow: number;
  members: TeamMember[];
  sos: HelpView[]; // pedidos de apoio abertos agora
};

export async function saveLocation(
  userId: string,
  pos: { lat: number; lng: number; accuracy: number | null }
): Promise<boolean> {
  const window = apoioWindow();
  if (!window.open) return false;

  // Nome e foto vêm do Clerk: busca só uma vez por dia (1ª posição do dia), não a cada envio.
  const existing = await prisma.userLocation.findUnique({
    where: { userId },
    select: { updatedAt: true },
  });
  const needsWho = !existing || existing.updatedAt.getTime() < window.start;
  const who = needsWho ? await whoIs(userId) : null;

  const now = new Date();
  await prisma.userLocation.upsert({
    where: { userId },
    create: { userId, name: who?.name ?? "Técnico", imageUrl: who?.imageUrl ?? "", ...pos, updatedAt: now },
    update: { ...pos, updatedAt: now, ...(who ? { name: who.name, imageUrl: who.imageUrl } : {}) },
  });
  return true;
}

export async function getTeamMap(viewerId: string): Promise<TeamMapData> {
  const now = Date.now();
  const window = apoioWindow(now);
  const base = { open: window.open, start: window.start, end: window.end, serverNow: now };
  if (!window.open) return { ...base, members: [], sos: [] };

  // Última posição de hoje (desde as 07:40) e de no máximo 30 min atrás.
  const since = new Date(Math.max(window.start, now - LOCATION_MAX_AGE_MS));
  const [rows, help] = await Promise.all([
    prisma.userLocation.findMany({ where: { updatedAt: { gte: since } } }),
    listActiveHelp(viewerId),
  ]);

  return {
    ...base,
    members: rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      imageUrl: r.imageUrl,
      lat: r.lat,
      lng: r.lng,
      accuracy: r.accuracy,
      updatedAt: r.updatedAt.getTime(),
      isMe: r.userId === viewerId,
    })),
    sos: help.filter((h) => !h.acceptedAt && !h.cancelledAt),
  };
}
