// APOIO DROP: pedido de ajuda com localização que alerta todos os técnicos.
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { apoioWindow } from "./apoioHours";

// Por quanto tempo o aviso "ajuda a caminho" continua aparecendo.
const RESOLVED_SHOW_MS = 10 * 60 * 1000;

export type HelpView = {
  id: string;
  name: string;
  imageUrl: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  address: string | null;
  bairro: string | null;
  city: string | null;
  createdAt: number; // epoch ms
  acceptedAt: number | null;
  acceptedByName: string | null;
  cancelledAt: number | null;
  isMine: boolean;
  iAccepted: boolean;
};

type HelpRow = {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  address: string | null;
  bairro: string | null;
  city: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  acceptedById: string | null;
  acceptedByName: string | null;
  cancelledAt: Date | null;
};

export function toHelpView(r: HelpRow, viewerId: string): HelpView {
  return {
    id: r.id,
    name: r.name,
    imageUrl: r.imageUrl,
    lat: r.lat,
    lng: r.lng,
    accuracy: r.accuracy,
    address: r.address,
    bairro: r.bairro,
    city: r.city,
    createdAt: r.createdAt.getTime(),
    acceptedAt: r.acceptedAt?.getTime() ?? null,
    acceptedByName: r.acceptedByName,
    cancelledAt: r.cancelledAt?.getTime() ?? null,
    isMine: r.userId === viewerId,
    iAccepted: r.acceptedById === viewerId,
  };
}

// Pedidos abertos (só dentro do horário de hoje: às 20:00 expiram) + os atendidos
// há pouco (para o aviso "ajuda a caminho").
export async function listActiveHelp(viewerId: string): Promise<HelpView[]> {
  const now = Date.now();
  const window = apoioWindow(now);
  const rows = await prisma.helpRequest.findMany({
    where: {
      OR: [
        ...(window.open
          ? [{ acceptedAt: null, cancelledAt: null, createdAt: { gte: new Date(window.start) } }]
          : []),
        { acceptedAt: { gte: new Date(now - RESOLVED_SHOW_MS) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => toHelpView(r, viewerId));
}

// Nome e foto de quem pede/atende (do Clerk; a foto prefere o avatar do /perfil).
export async function whoIs(userId: string) {
  const client = await clerkClient();
  const [user, profile] = await Promise.all([
    client.users.getUser(userId),
    prisma.profile.findUnique({ where: { userId } }),
  ]);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Técnico";
  return { name, imageUrl: profile?.avatarUrl ?? user.imageUrl };
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${sec} s`;
  return `${sec} s`;
}
