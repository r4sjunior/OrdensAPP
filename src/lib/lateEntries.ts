// Lançamento atrasado liberado pelo adm: durante a campanha só dá para registrar OS
// do dia, mas o adm pode liberar dias específicos para um técnico que esqueceu.
// As OS lançadas assim (Order.late = true) contam como se fossem do próprio dia,
// inclusive para o pódio.
//
// A lista fica na variável de ambiente LANCAMENTO_LIBERADO (na Vercel, fora do
// código, porque o repositório é público), no formato:
//   email=2026-11-03,2026-11-04;outro@email.com=2026-11-10
// Para tirar a liberação, apague a pessoa da variável e faça redeploy.

function parse(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entry of (process.env.LANCAMENTO_LIBERADO ?? "").split(";")) {
    const [email, dates] = entry.split("=");
    if (!email?.trim() || !dates) continue;
    const list = dates
      .split(",")
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    map.set(email.trim().toLowerCase(), list);
  }
  return map;
}

// Dias liberados para este e-mail (vazio se não tiver liberação).
export function lateDatesFor(email: string | null | undefined): string[] {
  if (!email) return [];
  return parse().get(email.toLowerCase()) ?? [];
}
