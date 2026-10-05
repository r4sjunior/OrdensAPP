// Compara a Rose antiga (filtro por palavra exata) com a busca nova,
// usando mensagens que o pessoal realmente mandou no grupo.
// Rodar: npm run test:busca
import { readFileSync } from "fs";
import { search } from "../src/lib/search";
import type { Entry } from "../src/lib/types";

const entries: Entry[] = JSON.parse(readFileSync("data/kb.json", "utf-8"));

// [mensagem real do histórico, slug esperado | null quando não existe resposta]
// "?slug" = pergunta ambígua: a Rose deve oferecer botões (com esse item entre eles), não chutar
const CASES: [string, string | null][] = [
  ["Achar cto", "achar-cto"],
  ["Senha master", "senha-master"],
  ["Senhas master", "senha-master"],
  ["Senha", "senha-master"],
  ["senhas", "senha-master"],
  ["Lembras das senhas supervisor", "senha-master"],
  ["IP os mobile", "ip-os-mobile"],
  ["Ip mobile", "ip-os-mobile"],
  ["IP OS", "ip-os-mobile"],
  ["Ip os mobile", "ip-os-mobile"],
  ["App os mobile", "app-os-mobile"],
  ["Controle universal", "controle-universal"],
  ["Código controle amino alguém lembra?", "controle-universal"],
  ["HD master", "hd-master"],
  ["Hd super", "hd-super"],
  ["Configuração zte", "config-zte"],
  ["configuração huawei", "config-huawei"],
  ["Configuração wifi Premium", "config-wifi-premium"],
  ["Configuração wi-fi Premium", "config-wifi-premium"],
  ["Check list", "check-list"],
  ["Cheque list", "check-list"],
  ["checklist", "check-list"],
  ["Pacote básico", "pacote-basico"],
  ["Pacote basico", "pacote-basico"],
  ["Tv básica", "pacote-basico"],
  ["Básica", "pacote-basico"],
  ["Pacotes tv amino", "?pacote-basico"], // ambíguo: deve oferecer opções
  ["Host amino", "host-amino"],
  ["Host amindo", "host-amino"],
  ["-host amino", "host-amino"],
  ["Áudio amino", "audio-amino"],
  ["Amino A50 sem áudio como faz", "audio-amino"],
  ["Dns", "dns"],
  ["Telefone telefonia", "telefone-cope"],
  ["Telefonia", "telefone-cope"],
  ["Reset decoder", "reset-decoder"],
  ["Deezer", "deezer"],
  ["Sem os", "sem-os"],
  ["Cmts", "cmts"],
  ["Nodos HFC desativado", "nodos-hfc-desativados"],
  ["Canais de atendimento", "canais-atendimento"],
  ["Fila cope", "canais-atendimento"],
  ["Zte-mesh-ont", "zte-mesh-ont"],
  ["Roteamento_mesh", "zte-mesh-ont"],
  ["Escala", "escala"],
  ["Scala", "escala"],
  ["Escala de setembro", "escala"],
  // buscas por código/nodo (impossível na Rose antiga)
  ["NA40", "cmts"],
  ["qual cmts do PA45", "cmts"],
  // erros de digitação
  ["senah master", "senha-master"],
  ["controle unversal", "controle-universal"],
  // sem resposta cadastrada: o certo é NÃO inventar
  ["Código hfc", null],
  ["kkkkkk", null],
  ["Rose baixa o Netflix no celular da empresa", null],
];

// Filtros que existiam na Rose (lista do /filters + os que ela respondia em 2026)
const ROSE_FILTERS = [
  "configuração wifi premium", "canais de atendimento", "nodos hfc desativado", "configuração huawei",
  "controle universal", "configuração zte", "sinal ont nokia", "sinal ont 2232", "app os mobile", "pacote básico",
  "reset decoder", "ip os mobile", "senha master", "zte-mesh-ont", "áudio amino", "check list", "cores rj45",
  "host amino", "hd master", "hd super", "deezer", "sem os", "cmts", "dgo", "dns", "achar cto", "código ont",
  "código ftth", "código telefonia", "registro auxílio", "telefone telefonia",
];
const ROSE_TO_SLUG: Record<string, string> = {
  "configuração wifi premium": "config-wifi-premium", "canais de atendimento": "canais-atendimento",
  "nodos hfc desativado": "nodos-hfc-desativados", "configuração huawei": "config-huawei",
  "controle universal": "controle-universal", "configuração zte": "config-zte", "sinal ont 2232": "sinal-ont-2232",
  "app os mobile": "app-os-mobile", "pacote básico": "pacote-basico", "reset decoder": "reset-decoder",
  "ip os mobile": "ip-os-mobile", "senha master": "senha-master", "zte-mesh-ont": "zte-mesh-ont",
  "áudio amino": "audio-amino", "check list": "check-list", "cores rj45": "cores-rj45", "host amino": "host-amino",
  "hd master": "hd-master", "hd super": "hd-super", deezer: "deezer", "sem os": "sem-os", cmts: "cmts", dns: "dns",
  "achar cto": "achar-cto", "código ont": "codigo-ont", "código ftth": "codigo-materiais",
  "código telefonia": "codigo-materiais", "registro auxílio": "registro-auxilio", "telefone telefonia": "telefone-cope",
};

function oldRose(msg: string): string | null {
  const m = msg.toLowerCase();
  // a Rose dispara o filtro mais longo contido na mensagem (sem perdoar acento, plural ou erro)
  const found = ROSE_FILTERS.filter((f) => new RegExp(`(^|[^\\p{L}\\d])${f}($|[^\\p{L}\\d])`, "u").test(m));
  found.sort((a, b) => b.length - a.length);
  return found[0] ? ROSE_TO_SLUG[found[0]] ?? null : null;
}

function newRose(msg: string): string | null {
  const hits = search(entries, msg);
  if (hits[0]?.confidence === "alta") return hits[0].entry.slug;
  const options = hits.filter((h) => h.confidence === "media").slice(0, 3);
  return options.length ? "?" + options.map((h) => h.entry.slug).join("|") : null;
}

let okOld = 0;
let okNew = 0;
for (const [msg, expected] of CASES) {
  const o = oldRose(msg);
  const n = newRose(msg);
  const hitO = o === (expected ? expected.replace("?", "") : null);
  const hitN = expected?.startsWith("?") ? !!n?.startsWith("?") && n.includes(expected.slice(1)) : n === expected;
  okOld += +hitO;
  okNew += +hitN;
  if (!hitN || !hitO) {
    const top = search(entries, msg).slice(0, 2).map((h) => `${h.entry.slug}:${h.score}`).join(" ");
    console.log(`${hitO ? "✓" : "✗"} antiga  ${hitN ? "✓" : "✗"} nova   "${msg}" → esperado ${expected ?? "(nada)"}, nova deu ${n ?? "(nada)"}  [${top}]`);
  }
}
console.log(`\nRose antiga: ${okOld}/${CASES.length} acertos`);
console.log(`Rose nova:   ${okNew}/${CASES.length} acertos`);
if (okNew < CASES.length) process.exitCode = 1;
