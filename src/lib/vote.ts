// Votação sigilosa do mapa da equipe.
//
// Sigilo: nenhum voto individual é gravado. A contagem { sim, nao } fica num único campo
// criptografado (AES-256-GCM, IV novo a cada gravação) que é aberto, somado e regravado
// dentro de uma transação com trava. Quem já votou fica só como HMAC(usuário) — sem
// horário e sem o voto — para impedir voto duplo. Ao encerrar, só os totais são abertos.
//
// Chave: VOTE_SECRET (se existir) ou, por padrão, derivada do CLERK_SECRET_KEY.
// Trocar essa chave no meio da votação impede abrir a contagem.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { todayISO, addDays } from "./dates";
import { MAPA_POLL, pollStartMs, type MapaFeature, type MapaVoteState } from "./voteConfig";

type Tally = { sim: number; nao: number };

function secret(): Buffer {
  const s = process.env.VOTE_SECRET || process.env.CLERK_SECRET_KEY;
  if (!s) throw new Error("Chave da votação não configurada (VOTE_SECRET ou CLERK_SECRET_KEY).");
  return Buffer.from(s);
}

function key(purpose: "tally" | "voter"): Buffer {
  return Buffer.from(hkdfSync("sha256", secret(), "ordens-votacao", `${MAPA_POLL.id}:${purpose}`, 32));
}

function encryptTally(t: Tally): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("tally"), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(t), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

function decryptTally(data: string): Tally {
  const raw = Buffer.from(data, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key("tally"), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  const t = JSON.parse(json);
  return { sim: Number(t.sim) || 0, nao: Number(t.nao) || 0 };
}

const voterHash = (userId: string) => createHmac("sha256", key("voter")).update(userId).digest("hex");

// Técnicos ativos = registraram pelo menos 1 OS nos 30 dias antes da abertura (lançadas
// antes da abertura, para a lista não mudar durante a votação).
function activeWhere() {
  const start = new Date(`${MAPA_POLL.start}T00:00:00.000Z`);
  const from = addDays(start, -MAPA_POLL.activeDays);
  return {
    date: { gte: from, lt: start },
    createdAt: { lt: new Date(pollStartMs()) },
  };
}

async function isActive(userId: string) {
  return !!(await prisma.order.findFirst({ where: { userId, ...activeWhere() }, select: { id: true } }));
}

async function countActive() {
  const rows = await prisma.order.groupBy({ by: ["userId"], where: activeWhere() });
  return rows.length;
}

const isOpenDay = () => todayISO() >= MAPA_POLL.start;

// Cria a votação na primeira vez que alguém a acessa a partir do dia da abertura.
async function getPoll() {
  const found = await prisma.votePoll.findUnique({ where: { id: MAPA_POLL.id } });
  if (found || !isOpenDay()) return found;
  const eligible = await countActive();
  return prisma.votePoll.upsert({
    where: { id: MAPA_POLL.id },
    create: { id: MAPA_POLL.id, startsAt: new Date(pollStartMs()), eligible, tallyCipher: encryptTally({ sim: 0, nao: 0 }) },
    update: {},
  });
}

function featureOf(poll: { outcome: string | null } | null): MapaFeature {
  if (poll?.outcome === "aprovado") return "approved";
  if (poll?.outcome === "rejeitado") return "rejected";
  return "pending";
}

// Estado da função (ligada / aguardando / removida). Barato: uma leitura.
export async function mapaFeature(): Promise<MapaFeature> {
  const poll = await prisma.votePoll.findUnique({ where: { id: MAPA_POLL.id }, select: { outcome: true } });
  return featureOf(poll);
}

export async function getMapaVoteState(userId: string | null): Promise<MapaVoteState> {
  const poll = await getPoll();
  const base: MapaVoteState = {
    feature: featureOf(poll),
    phase: !poll ? "soon" : poll.closedAt ? "closed" : "open",
    start: MAPA_POLL.start,
    canVote: false,
    voted: false,
    votedCount: 0,
    eligibleCount: poll?.eligible ?? 0,
    result: poll?.closedAt ? { yes: poll.yes ?? 0, no: poll.no ?? 0 } : null,
  };
  if (!poll) return base;

  const [voted, votedCount, canVote] = await Promise.all([
    userId
      ? prisma.voteVoter.findUnique({ where: { pollId_voterHash: { pollId: poll.id, voterHash: voterHash(userId) } } })
      : null,
    prisma.voteVoter.count({ where: { pollId: poll.id } }),
    userId ? isActive(userId) : false,
  ]);
  return { ...base, voted: !!voted, votedCount, canVote };
}

export class VoteError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// Fecha a votação abrindo a contagem. Só os totais saem daqui.
async function finalizeIn(
  tx: Prisma.TransactionClient,
  poll: { id: string; tallyCipher: string },
  by: "todos" | "adm"
) {
  const t = decryptTally(poll.tallyCipher);
  const voted = await tx.voteVoter.count({ where: { pollId: poll.id } });
  await tx.votePoll.update({
    where: { id: poll.id },
    data: {
      closedAt: new Date(),
      closedBy: by,
      yes: t.sim,
      no: t.nao,
      voted,
      // precisa de maioria de SIM; empate não aprova
      outcome: t.sim > t.nao ? "aprovado" : "rejeitado",
    },
  });
}

export async function castVote(userId: string, choice: "sim" | "nao") {
  const poll = await getPoll();
  if (!poll) throw new VoteError(`A votação abre em ${MAPA_POLL.start.split("-").reverse().join("/")}.`, 403);
  if (poll.closedAt) throw new VoteError("A votação já foi encerrada.", 409);
  if (!(await isActive(userId))) {
    throw new VoteError(`Só votam os técnicos ativos (com OS registrada nos ${MAPA_POLL.activeDays} dias antes da votação).`, 403);
  }
  const hash = voterHash(userId);

  return prisma.$transaction(async (tx) => {
    // Trava a votação: dois votos ao mesmo tempo não perdem contagem.
    await tx.$queryRaw`SELECT id FROM "VotePoll" WHERE id = ${poll.id} FOR UPDATE`;
    const current = await tx.votePoll.findUniqueOrThrow({ where: { id: poll.id } });
    if (current.closedAt) throw new VoteError("A votação já foi encerrada.", 409);

    const already = await tx.voteVoter.findUnique({ where: { pollId_voterHash: { pollId: poll.id, voterHash: hash } } });
    if (already) throw new VoteError("Você já votou. O voto é secreto e não pode ser alterado.", 409);

    const t = decryptTally(current.tallyCipher);
    t[choice] += 1;
    const tallyCipher = encryptTally(t);
    await tx.voteVoter.create({ data: { pollId: poll.id, voterHash: hash } });
    await tx.votePoll.update({ where: { id: poll.id }, data: { tallyCipher } });

    // Todos os ativos votaram: encerra e o app já liga ou remove o mapa.
    const voted = await tx.voteVoter.count({ where: { pollId: poll.id } });
    if (voted >= current.eligible) {
      await finalizeIn(tx, { id: poll.id, tallyCipher }, "todos");
      return { closed: true };
    }
    return { closed: false };
  });
}

// Encerramento pelo adm (ex.: alguém ativo não vai votar). Abre a contagem com quem votou.
export async function closeVoteByAdm() {
  const poll = await getPoll();
  if (!poll) throw new VoteError("A votação ainda não abriu.", 403);
  if (poll.closedAt) throw new VoteError("A votação já foi encerrada.", 409);
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "VotePoll" WHERE id = ${poll.id} FOR UPDATE`;
    const current = await tx.votePoll.findUniqueOrThrow({ where: { id: poll.id } });
    if (current.closedAt) throw new VoteError("A votação já foi encerrada.", 409);
    await finalizeIn(tx, current, "adm");
  });
}

// Documento da votação para o /adm: sem nomes; parcial só mostra participação.
export type VoteReport = {
  id: string;
  title: string;
  question: string;
  start: string;
  phase: "soon" | "open" | "closed";
  eligible: number;
  voted: number;
  closedAt: string | null;
  closedBy: string | null;
  yes: number | null;
  no: number | null;
  outcome: string | null;
};

export async function getVoteReport(): Promise<VoteReport> {
  const poll = await getPoll();
  const voted = poll ? (poll.voted ?? (await prisma.voteVoter.count({ where: { pollId: poll.id } }))) : 0;
  return {
    id: MAPA_POLL.id,
    title: MAPA_POLL.title,
    question: MAPA_POLL.question,
    start: MAPA_POLL.start,
    phase: !poll ? "soon" : poll.closedAt ? "closed" : "open",
    eligible: poll?.eligible ?? (await countActive()),
    voted,
    closedAt: poll?.closedAt?.toISOString() ?? null,
    closedBy: poll?.closedBy ?? null,
    yes: poll?.yes ?? null,
    no: poll?.no ?? null,
    outcome: poll?.outcome ?? null,
  };
}
