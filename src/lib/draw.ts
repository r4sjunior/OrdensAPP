// Sorteio da roleta da Caixinha de Gela.
//
// VALENDO -> o servidor sorteia o vencedor na hora (aleatoriedade criptográfica,
// ponderada pela sorte depositada) e grava tudo. A roleta começa a girar 2 min depois
// e todos os aparelhos animam o mesmo giro pelo relógio do servidor. O vencedor só
// é enviado aos aparelhos poucos segundos antes do giro, para ninguém "espiar".
import { randomInt } from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { luckWeight } from "./campaign";
import { getAllTickets } from "./tickets";

export const SPIN_DELAY_MS = 120_000; // contagem regressiva depois do VALENDO
export const SPIN_MS = 12_000; // duração do giro
const REVEAL_BEFORE_MS = 6_000; // vencedor vai para os aparelhos 6s antes de girar

export type Participant = {
  userId: string;
  name: string; // só para o /adm; nunca vai para os aparelhos
  imageUrl: string;
  earned: number;
  luck: number; // sorte depositada que vale (número de sorte)
  weight: number;
};

async function listAllUsers() {
  const client = await clerkClient();
  const users = [];
  for (let offset = 0; ; offset += 100) {
    const page = await client.users.getUserList({ limit: 100, offset, orderBy: "created_at" });
    users.push(...page.data);
    if (page.data.length < 100) break;
  }
  return users;
}

// Entram na roleta só as contas que já registraram pelo menos uma OS no app (contas
// de teste ou que nunca usaram ficam de fora), com tickets e sorte (inclusive quem tem 0).
export async function getParticipants(): Promise<Participant[]> {
  const [users, tickets, deposits, withOrders] = await Promise.all([
    listAllUsers(),
    getAllTickets(),
    prisma.luckDeposit.findMany(),
    prisma.order.findMany({ distinct: ["userId"], select: { userId: true } }),
  ]);
  const deposited = new Map(deposits.map((d) => [d.userId, d.amount]));
  const registered = new Set(withOrders.map((o) => o.userId));

  return users.filter((u) => registered.has(u.id)).map((u) => {
    const earned = tickets.get(u.id)?.earned ?? 0;
    const luck = Math.min(deposited.get(u.id) ?? 0, earned);
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.primaryEmailAddress?.emailAddress ||
      u.id;
    return { userId: u.id, name, imageUrl: u.imageUrl, earned, luck, weight: luckWeight(luck) };
  });
}

// Sorteio ponderado: chance de cada um = peso / soma dos pesos.
export function pickWeighted(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = (randomInt(0, 2 ** 48 - 1) / 2 ** 48) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

export async function createDraw(test: boolean) {
  const participants = await getParticipants();
  if (participants.length === 0) throw new Error("Ninguém registrou ordens ainda.");
  const winnerIndex = pickWeighted(participants.map((p) => p.weight));
  return prisma.draw.create({
    data: {
      spinAt: new Date(Date.now() + SPIN_DELAY_MS),
      test,
      participants,
      winnerIndex,
    },
  });
}

// Sorteio aberto que aparece na tela de todos (os de teste ficam só no /adm).
export function getOpenDraw(includeTest = false) {
  return prisma.draw.findFirst({
    where: { closedAt: null, ...(includeTest ? {} : { test: false }) },
    orderBy: { createdAt: "desc" },
  });
}

export type DrawView = {
  id: string;
  test: boolean;
  spinAt: number; // epoch ms (relógio do servidor)
  spinMs: number;
  serverNow: number;
  slices: { imageUrl: string; luck: number; weight: number; isMe: boolean }[];
  winnerIndex: number | null; // null até perto do giro
  closed: boolean;
};

// O que vai para os aparelhos: fotos e pesos, sem ids nem nomes.
export function toView(
  draw: { id: string; test: boolean; spinAt: Date; participants: unknown; winnerIndex: number; closedAt: Date | null },
  viewerUserId: string | null
): DrawView {
  const now = Date.now();
  const participants = draw.participants as Participant[];
  const revealed = now >= draw.spinAt.getTime() - REVEAL_BEFORE_MS;
  return {
    id: draw.id,
    test: draw.test,
    spinAt: draw.spinAt.getTime(),
    spinMs: SPIN_MS,
    serverNow: now,
    slices: participants.map((p) => ({
      imageUrl: p.imageUrl,
      luck: p.luck,
      weight: p.weight,
      isMe: p.userId === viewerUserId,
    })),
    winnerIndex: revealed ? draw.winnerIndex : null,
    closed: draw.closedAt !== null,
  };
}
