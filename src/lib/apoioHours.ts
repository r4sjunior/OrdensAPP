// Horário do APOIO DROP: todos os dias das 07:40 às 20:00 (Brasília). Fora disso não
// dá para pedir apoio, e pedido aberto sem atendimento expira às 20:00.
import { todayISO } from "./dates";

export const APOIO_START = "07:40";
export const APOIO_END = "20:00";

// Brasília sem horário de verão: -03:00 fixo.
function at(dayISO: string, hhmm: string) {
  return new Date(`${dayISO}T${hhmm}:00-03:00`).getTime();
}

export function apoioWindow(now: number = Date.now()) {
  const day = todayISO();
  const start = at(day, APOIO_START);
  const end = at(day, APOIO_END);
  return { open: now >= start && now < end, start, end };
}
