// Helpers de data usados para montar os extratos (diário, semanal, mensal).
// Semana vai de domingo a sábado: o ranking semanal zera todo domingo às 0:00.

// Fuso usado para decidir qual é "hoje" (e, portanto, a virada do dia/mês).
// Sem isso, após as 21h no Brasil o UTC já está no dia seguinte.
export const APP_TIME_ZONE = "America/Sao_Paulo";

// Dia (YYYY-MM-DD) de um instante no fuso de Brasília.
export function isoInAppTZ(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Data de hoje (YYYY-MM-DD) no fuso de Brasília.
export function todayISO(): string {
  return isoInAppTZ(new Date());
}

// "Hoje" como Date à meia-noite UTC, no mesmo formato das datas salvas no banco.
export function today(): Date {
  return new Date(`${todayISO()}T00:00:00.000Z`);
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfDay(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return x;
}

export function startOfWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0 = domingo, 6 = sábado
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - day); // volta até o domingo
  return startOfDay(sunday);
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return end;
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function formatBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export const WEEKDAY_LABELS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTH_LABELS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
