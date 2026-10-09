// Geometria e movimento da roleta. Tudo em função do relógio do servidor, para todos
// os aparelhos mostrarem o mesmo giro e pararem na mesma fatia.
// Ângulos em graus, sentido horário, 0 = topo (onde fica o ponteiro).

export const IDLE_DEG_PER_SEC = 24; // giro lento durante a contagem
const SPIN_TURNS = 8; // voltas completas antes de parar

export type SliceGeom = { start: number; size: number };

// Fatia proporcional ao peso: o tamanho na tela é a chance real.
export function sliceGeometry(weights: number[]): SliceGeom[] {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let start = 0;
  return weights.map((w) => {
    const size = (w / total) * 360;
    const g = { start, size };
    start += size;
    return g;
  });
}

const mod360 = (a: number) => ((a % 360) + 360) % 360;

// Número estável entre -0,3 e 0,3 a partir do id do sorteio: o ponteiro não para
// sempre no meio exato da fatia (fica mais natural), mas é igual em todo aparelho.
function offsetFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * 0.6;
}

// Desacelera bem devagar no final (suspense nas últimas fatias).
const easeOutQuint = (p: number) => 1 - Math.pow(1 - p, 5);

export type SpinInput = {
  id: string;
  spinAt: number; // ms (servidor)
  spinMs: number;
  geometry: SliceGeom[];
  winnerIndex: number | null;
};

// Quanto a roleta girou no instante `now` (ms do servidor).
export function wheelAngle(s: SpinInput, now: number): number {
  const elapsed = now - s.spinAt;
  if (elapsed < 0 || s.winnerIndex === null) {
    return mod360((IDLE_DEG_PER_SEC * elapsed) / 1000);
  }
  const g = s.geometry[s.winnerIndex];
  const target = g.start + g.size * (0.5 + offsetFromId(s.id));
  // Parar com `target` embaixo do ponteiro (topo): ângulo final ≡ -target.
  const total = SPIN_TURNS * 360 + mod360(-target);
  return total * easeOutQuint(Math.min(1, elapsed / s.spinMs));
}

// Fatia que está embaixo do ponteiro com a roleta girada em `angle`.
export function sliceAtPointer(geometry: SliceGeom[], angle: number): number {
  const local = mod360(-angle);
  for (let i = 0; i < geometry.length; i++) {
    const g = geometry[i];
    if (local >= g.start && local < g.start + g.size) return i;
  }
  return geometry.length - 1;
}
