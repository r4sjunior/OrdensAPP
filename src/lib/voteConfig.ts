// Votação do mapa da equipe (atualização de 17/11: ícone OS no topo → /mapa com a
// localização dos técnicos). A função fica DESATIVADA até a equipe decidir.
// Arquivo sem banco/crypto: pode ser importado nas telas.

export const MAPA_POLL = {
  id: "mapa-equipe-2026-11",
  start: "2026-11-19", // votação abre às 00:00 (Brasília) e o vídeo aparece sozinho uma vez
  activeDays: 30, // "ativo" = registrou pelo menos 1 OS nos 30 dias antes da abertura
  title: "Mapa da equipe — localização dos técnicos",
  question: "Você aprova o mapa da equipe com a localização dos técnicos em tempo real?",
} as const;

// pending: desativado aguardando a votação · approved: ligado · rejected: removido do app
export type MapaFeature = "pending" | "approved" | "rejected";

export type MapaVoteState = {
  feature: MapaFeature;
  phase: "soon" | "open" | "closed"; // soon = antes de abrir a votação
  start: string; // AAAA-MM-DD
  canVote: boolean; // é técnico ativo
  voted: boolean;
  votedCount: number;
  eligibleCount: number;
  result: { yes: number; no: number } | null; // só depois de encerrada
};

export const pollStartMs = () => new Date(`${MAPA_POLL.start}T00:00:00-03:00`).getTime();

export const fmtDay = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
