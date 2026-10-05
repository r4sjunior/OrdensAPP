import type { Entry } from "./types";

// Palavras que não ajudam a achar nada ("como faz", "qual o", "rose", ...).
const STOP = new Set(
  (
    "a o as e de da do das dos em no na nos nas um uma uns umas pra pro para por com " +
    "como faz fazer qual quais que onde tem ta to ai la me alguem sabe lembra lembram favor " +
    "rose oi ola opa eai bom boa dia tarde noite galera pessoal ajuda preciso quero manda mandar " +
    "ver e eh é isso desse dessa esse essa aqui ali"
  ).split(" "),
);

// Sinônimos e grafias que o pessoal usava no grupo -> forma canônica.
const SYN: Record<string, string> = {
  cod: "codigo",
  cods: "codigo",
  fibra: "ftth",
  cheque: "check",
  chek: "check",
  checklist: "check list",
  scala: "escala",
  amindo: "amino",
  config: "configuracao",
  configurar: "configuracao",
  configura: "configuracao",
  wifi6: "wifi 6",
  wifi7: "wifi 7",
  basica: "basico",
  mobili: "mobile",
  zyxel: "zyxel",
  modem: "modem",
  modens: "modem",
  onts: "ont",
  onu: "ont",
  decodificador: "decoder",
  decod: "decoder",
  tel: "telefone",
  fone: "telefone",
  som: "audio",
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/wi-?fi/g, "wifi")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stem(t: string): string {
  // plural simples: senhas -> senha, codigos -> codigo, nodos -> nodo
  if (t.length > 3 && t.endsWith("s") && !/\d/.test(t)) return t.slice(0, -1);
  return t;
}

export function tokens(s: string, keepStop = false): string[] {
  const out: string[] = [];
  for (const raw of normalize(s).split(" ")) {
    if (!raw) continue;
    const syn = SYN[raw] ?? SYN[stem(raw)];
    const parts = syn ? syn.split(" ") : [raw];
    for (const p of parts) {
      if (!keepStop && STOP.has(p)) continue;
      out.push(stem(p));
    }
  }
  return out;
}

// Distância de edição com transposição (Damerau), limitada para ser barata.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

// Quanto um token da busca "bate" com um token da resposta (0 a 1).
function tokenMatch(q: string, t: string): number {
  if (q === t) return 1;
  if (/\d/.test(q) || /\d/.test(t)) {
    // códigos e modelos (675411, NA40, 2232) só valem se baterem certinho ou como prefixo longo
    return q.length >= 4 && t.startsWith(q) ? 0.85 : 0;
  }
  if (q.length >= 4 && t.startsWith(q)) return 0.85; // "config" -> "configuracao"
  if (q.length === 3 && t.length === 4 && t.startsWith(q)) return 0.8; // "ftt" -> "ftth"
  if (t.length >= 4 && q.startsWith(t) && q.length - t.length <= 3) return 0.8;
  const max = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
  if (max && editDistance(q, t, max) <= max) return 0.75; // erro de digitação
  return 0;
}

type Indexed = {
  entry: Entry;
  phrases: string[]; // título + palavras-chave, já normalizados
  strong: string[]; // tokens do título/palavras-chave
  weak: Set<string>; // tokens do conteúdo
};

function index(entry: Entry): Indexed {
  const phrases = [entry.title, ...entry.keywords].map((p) => tokens(p).join(" ")).filter(Boolean);
  const strong = Array.from(new Set(phrases.join(" ").split(" ").filter(Boolean)));
  const weak = new Set(tokens(entry.content));
  return { entry, phrases, strong, weak };
}

export type Hit = {
  entry: Entry;
  score: number;
  /** "alta" = pode responder direto; "media" = vale sugerir; "baixa" = só listagem */
  confidence: "alta" | "media" | "baixa";
};

export function search(entries: Entry[], query: string, limit = 8): Hit[] {
  const q = tokens(query);
  if (q.length === 0) return [];
  const qPhrase = q.join(" ");

  const hits: Hit[] = [];
  for (const idx of entries.map(index)) {
    let score = 0;

    // 1) frase inteira bate com uma palavra-chave (o jeito da Rose antiga, mas sem acento/plural)
    let phraseHits = 0;
    for (const p of idx.phrases) {
      const pt = p.split(" ");
      const pLen = pt.length;
      if (` ${p} `.includes(` ${qPhrase} `) || ` ${qPhrase} `.includes(` ${p} `)) phraseHits++;
      if (p === qPhrase) {
        score = Math.max(score, 1000);
      } else if (` ${qPhrase} `.includes(` ${p} `)) {
        // palavra-chave dentro da pergunta: "amino a50 sem audio como faz" contém "a50 sem audio"
        score = Math.max(score, Math.round((400 * pLen) / q.length));
      } else if (` ${p} `.includes(` ${qPhrase} `)) {
        // pergunta dentro da palavra-chave: "cto" está em "achar cto"
        score = Math.max(score, 150 + q.length * 25);
      } else if (pLen === q.length && pLen > 1) {
        // mesma frase com erro de digitação: "senah master" ~ "senha master"
        const m = Math.min(...pt.map((t, i) => tokenMatch(q[i], t)));
        if (m > 0) score = Math.max(score, Math.round(1000 * m));
      }
    }
    // desempate: quanto mais palavras-chave batem, mais a resposta é "a" resposta
    if (score > 0 && score < 1000) score += Math.min(phraseHits, 4) * 5;

    // 2) cobertura token a token, com tolerância a erro
    let covered = 0;
    let sum = 0;
    for (const qt of q) {
      let best = 0;
      for (const st of idx.strong) best = Math.max(best, tokenMatch(qt, st));
      if (best < 1) {
        if (idx.weak.has(qt)) best = Math.max(best, /\d/.test(qt) ? 0.9 : 0.4);
        else if (qt.length >= 5) for (const wt of idx.weak) if (tokenMatch(qt, wt) >= 0.75) { best = Math.max(best, 0.3); break; }
      }
      if (best > 0) covered++;
      sum += best;
    }
    const coverage = covered / q.length;
    score = Math.max(score, Math.round((sum / q.length) * 100 * (0.5 + coverage / 2)));

    if (score >= 25) {
      hits.push({ entry: idx.entry, score, confidence: "baixa" });
    }
  }

  hits.sort((a, b) => b.score - a.score || b.entry.hits - a.entry.hits);
  const [first, second] = hits;
  for (const h of hits) {
    h.confidence = h.score >= 70 ? "media" : "baixa";
  }
  if (first && first.score >= 70 && (!second || first.score >= 300 || first.score - second.score >= 15)) {
    first.confidence = "alta";
  }
  return hits.slice(0, limit);
}

/** Mensagem de grupo que parece uma pergunta para a Rose (e não conversa ou "kkkk"). */
export function looksLikeQuery(text: string): boolean {
  const n = normalize(text);
  if (!n || /^(k|ha|rs|he)+$/.test(n.replace(/ /g, ""))) return false;
  const words = n.split(" ");
  return words.length <= 6 || /\brose\b/.test(n) || text.trim().endsWith("?");
}

export function isGreeting(text: string): boolean {
  return /^(oi|ola|opa|eai|e ai|bom dia|boa tarde|boa noite)?\s*rose\b/.test(normalize(text)) && tokens(text).length === 0;
}
