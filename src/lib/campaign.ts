// Campanha "Caixinha de Gela": de 01/11 a 11/12 cada ordem vale 1 ticket e o 1º lugar
// do dia, da semana e do mês ganha tickets extras. O usuário escolhe quantos tickets
// deposita como sorte no sorteio da confraternização.
import { todayISO } from "./dates";

// NEXT_PUBLIC_CAMPAIGN_START/END só existem para testar localmente antes de novembro;
// em produção não defina e valem as datas abaixo.
export const CAMPAIGN = {
  name: "Caixinha de Gela",
  start: process.env.NEXT_PUBLIC_CAMPAIGN_START || "2026-11-01", // inclusive
  end: process.env.NEXT_PUBLIC_CAMPAIGN_END || "2026-12-11", // inclusive — dia da confraternização (antes era 20/12)
};

// Vídeos que abrem no card do sorteio:
// - a chamada da campanha aparece até o fim de novembro (some em 01/12);
// - a vinheta de Natal aparece só no dia 01/12.
export const CHAMADA_UNTIL = "2026-11-30"; // inclusive
export const NATAL_DAY = "2026-12-01";

export type Promo = "chamada" | "natal";

export function promoFor(iso: string = todayISO()): Promo | null {
  if (iso === NATAL_DAY) return "natal";
  if (iso <= CHAMADA_UNTIL) return "chamada";
  return null;
}

// Tickets extras para o 1º lugar (empate: todos os empatados ganham).
export const BONUS = { daily: 2, weekly: 7, monthly: 10 } as const;

export type CampaignPhase = "before" | "active" | "ended";

export function campaignPhase(iso: string = todayISO()): CampaignPhase {
  if (iso < CAMPAIGN.start) return "before";
  if (iso > CAMPAIGN.end) return "ended";
  return "active";
}

// Peso na roleta: todo mundo tem 1; a sorte depositada aumenta a chance sem decidir
// sozinha (raiz quadrada: 225 tickets = 16, não 226).
export function luckWeight(deposited: number): number {
  return 1 + Math.sqrt(Math.max(0, deposited));
}
