// Helpers de data usados para montar os extratos (diário, semanal, mensal).
// Semana começa na segunda-feira (padrão BR).

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfDay(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return x;
}

export function startOfWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0 = domingo
  const diff = (day === 0 ? -6 : 1) - day; // volta até a segunda-feira
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return startOfDay(monday);
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

export const WEEKDAY_LABELS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const MONTH_LABELS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
