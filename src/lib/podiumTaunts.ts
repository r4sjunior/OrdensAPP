// Frases dos balões de fala no pódio e no ranking: o app "provoca" conforme a
// classificação muda. Sorteadas aleatoriamente e trocadas a cada poucos segundos.

export type TauntKind = "leader" | "lost" | "passed";

export const TAUNTS: Record<TauntKind, string[]> = {
  // 🥇 Quem está em 1º lugar
  leader: [
    "O topo é meu! 😎",
    "Respeita o campeão!",
    "Ninguém segura essa máquina!",
    "Hoje ninguém me alcança!",
    "O primeiro lugar tem dono!",
    "Trabalhando e dominando!",
    "Pode olhar, eu tô no topo!",
    "A liderança é minha!",
    "Mais uma visita, mais uma vitória!",
    "Nasci pra liderar!",
    "O pódio tem novo rei!",
    "Tá pago! Sou o número 1!",
    "Aqui é produtividade!",
    "O topo combina comigo!",
    "Enquanto uns tentam, eu faço!",
    "Modo campeão ativado!",
    "Alguém consegue me alcançar?",
    "A concorrência tá difícil!",
    "O trabalho fala por mim!",
    "Segura essa liderança! 🔥",
  ],
  // 😤 Quem perdeu o 1º lugar
  lost: [
    "Ei! Quem pegou meu lugar?",
    "Isso não vai ficar assim!",
    "Preciso acelerar!",
    "Me roubaram a coroa! 👑",
    "Já estava me acostumando...",
    "Calma, vou voltar!",
    "Foi só uma pausa!",
    "A liderança escapou!",
    "Ainda não acabou!",
    "Quero minha posição de volta!",
    "Alguém me ultrapassou?!",
    "Hora de recuperar o terreno!",
    "Essa coroa é emprestada!",
    "Vou ter que trabalhar dobrado!",
    "Não contem vitória ainda!",
    "O topo está me chamando!",
    "Foi bom enquanto durou!",
    "Recalculando minha estratégia...",
    "Minha revanche vem aí!",
    "Aproveita enquanto pode! 😏",
  ],
  // 🚀 Quem foi ultrapassado e perdeu posições
  passed: [
    "Opa! Passaram na minha frente!",
    "Tô ficando pra trás!",
    "Esse aí tá voando!",
    "Preciso pisar no acelerador!",
    "Ultrapassagem detectada!",
    "Ei, me espera!",
    "Não vale ultrapassar assim!",
    "A concorrência tá nervosa!",
    "Lá se foi mais uma posição!",
    "Vou buscar esse cidadão!",
    "Tá pensando que é corrida?",
    "Esse placar tá de brincadeira!",
    "Hora de reagir!",
    "Não vou deixar barato!",
    "Estão passando como foguete!",
    "Preciso recuperar o ritmo!",
    "Me ultrapassou? Anotado!",
    "A disputa tá ficando séria!",
    "Vou voltar com tudo!",
    "Essa corrida ainda não acabou! 🔥",
  ],
};

// Por quanto tempo o balão de "perdeu posição" continua aparecendo depois da queda.
const EVENT_TTL_MS = 12 * 60 * 60 * 1000;

type Saved = { pos: number; event?: "lost" | "passed"; at?: number };

// Compara a posição atual do usuário com a última vista neste aparelho (por ranking e
// período) e diz se ele caiu. O ranking é anônimo, então só dá para saber da própria
// queda. `pos` = null quando o usuário não aparece na lista (fora do pódio).
export function trackMyPosition(key: string, pos: number | null, outside: number): "lost" | "passed" | null {
  const current = pos ?? outside;
  let saved: Saved | null = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) saved = JSON.parse(raw) as Saved;
  } catch {
    saved = null;
  }

  const now = Date.now();
  let next: Saved = { pos: current };
  if (saved && typeof saved.pos === "number") {
    if (current > saved.pos) {
      next = { pos: current, event: saved.pos === 1 ? "lost" : "passed", at: now };
    } else if (current === saved.pos && saved.event && saved.at && now - saved.at < EVENT_TTL_MS) {
      next = saved; // continua mostrando a queda recente
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* sem armazenamento: só não lembra da posição */
  }
  return next.event ?? null;
}
