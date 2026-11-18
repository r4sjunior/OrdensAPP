"use client";

import { useEffect, useState } from "react";
import { MAPA_SONG, playSong } from "@/lib/chiptune";
import { pixelFont } from "@/lib/pixelFont";
import { APOIO_END, APOIO_START } from "@/lib/apoioHours";
import { C, Pixels, Sprite, TECH_FRAMES, lerp, pixelLine, prog, techPalette, type Rect } from "./CampaignTrailer";

// Vídeo 8-bit da votação do mapa da equipe (mesmos técnicos da chamada da Caixinha).
// Explica o que a atualização do ícone OS fazia, por que foi desativada e como funciona
// a votação. Tudo calculado a partir do tempo `t`, a 12 quadros/s (≈42s, igual à música).

const W = 96;
const H = 160;
const FPS = 12;
export const MAPA_TRAILER_SECONDS = 42.5;

// Cenas (segundos)
const S1 = 5; // celular: toque no OS
const S2 = 12; // mapa com os carrinhos e o SOS
const S3 = 20; // cadeado: desativado
const S4 = 27; // urna: voto secreto
const S5 = 35; // regras do resultado + contagem

const STAMP = "#D9552C";
const PALETTES = [techPalette(C.white), techPalette(C.yellow), techPalette("#00E436")];
const GROUND = 150;

const tech = (i: number, x: number, y: number, t: number, walking: boolean) => (
  <Sprite
    key={`tech-${i}`}
    rows={TECH_FRAMES[walking ? Math.floor(t * 8) % 2 : 0]}
    palette={PALETTES[i]}
    x={x - 5}
    y={y - 15}
  />
);

function sky(top: string, bottom: string): Rect[] {
  return [
    { x: 0, y: 0, w: W, h: 80, c: top },
    { x: 0, y: 80, w: W, h: GROUND - 80, c: bottom },
    { x: 0, y: GROUND, w: W, h: 2, c: C.green },
    { x: 0, y: GROUND + 2, w: W, h: H - GROUND - 2, c: C.brown },
  ];
}

const STARS = [[8, 6], [30, 14], [52, 5], [80, 11], [90, 26], [16, 32], [42, 24], [70, 40], [6, 60], [86, 64]];
const stars = (t: number): Rect[] =>
  STARS.filter((_, i) => (Math.floor(t * 2) + i) % 3 !== 0).map(([x, y]) => ({ x, y, c: C.white }));

// Carrinho da Telecom visto de cima (7×5) com a escada no teto.
const VAN = [".WWWWW.", "WOOOOOW", "WWLLLWW", "WOOOOOW", ".K...K."];
const VAN_PAL = { W: C.white, O: STAMP, L: C.lgray, K: C.black };

// Pino vermelho do SOS (5×7)
const PIN = [".RRR.", "RRWRR", "RWWWR", "RRWRR", ".RRR.", "..R..", "..R.."];
const PIN_PAL = { R: C.red, W: C.white };

// Cadeado (16×18)
const LOCK = [
  "....YYYYYYYY....",
  "...YY......YY...",
  "..YY........YY..",
  "..Y..........Y..",
  "..Y..........Y..",
  "..Y..........Y..",
  "OOOOOOOOOOOOOOOO",
  "OYYYYYYYYYYYYYYO",
  "OYYYYYYYYYYYYYYO",
  "OYYYYYYKKYYYYYYO",
  "OYYYYYKKKKYYYYYO",
  "OYYYYYKKKKYYYYYO",
  "OYYYYYYKKYYYYYYO",
  "OYYYYYYKKYYYYYYO",
  "OYYYYYYKKYYYYYYO",
  "OYYYYYYYYYYYYYYO",
  "OYYYYYYYYYYYYYYO",
  "OOOOOOOOOOOOOOOO",
];
const LOCK_PAL = { Y: C.yellow, O: C.orange, K: C.black };

// ---- cena 1: celular ------------------------------------------------------
function phoneScene(t: number): Rect[] {
  const r: Rect[] = [...sky(C.navy, C.lavender), ...stars(t)];
  const px = 26, py = 22, pw = 44, ph = 116;
  r.push({ x: px, y: py, w: pw, h: ph, c: C.black });
  r.push({ x: px + 2, y: py + 2, w: pw - 4, h: ph - 4, c: C.dgray });
  const sx = px + 4, sy = py + 8, sw = pw - 8, sh = ph - 18;
  const opened = t >= S1 + 3.4;
  if (!opened) {
    r.push({ x: sx, y: sy, w: sw, h: sh, c: C.white });
    // header com o ícone OS (laranja) e os botões do menu
    r.push({ x: sx, y: sy, w: sw, h: 9, c: C.lgray });
    const blink = t >= S1 + 1.5 && Math.floor(t * 4) % 2 === 0;
    r.push({ x: sx + 2, y: sy + 2, w: 6, h: 5, c: blink ? C.yellow : STAMP });
    r.push({ x: sx + 11, y: sy + 4, w: 6, h: 1, c: C.dgray }, { x: sx + 19, y: sy + 4, w: 6, h: 1, c: C.dgray });
    for (let i = 0; i < 6; i++) r.push({ x: sx + 3, y: sy + 14 + i * 12, w: sw - 6, h: 8, c: C.peach });
  } else {
    // abriu o mapa: quarteirões verdes, ruas e carrinhos
    r.push({ x: sx, y: sy, w: sw, h: sh, c: "#00A45A" });
    for (let y = sy + 14; y < sy + sh; y += 22) r.push({ x: sx, y, w: sw, h: 3, c: C.lgray });
    r.push({ x: sx + 12, y: sy, w: 3, h: sh, c: C.lgray }, { x: sx + 26, y: sy, w: 3, h: sh, c: C.lgray });
    r.push({ x: sx, y: sy, w: sw, h: 9, c: C.lgray });
    r.push({ x: sx + 2, y: sy + 2, w: 6, h: 5, c: STAMP });
  }
  // botão de baixo
  r.push({ x: px + pw / 2 - 3, y: py + ph - 7, w: 6, h: 3, c: C.lgray });

  // dedo vindo de baixo e tocando no OS
  const reach = prog(t, S1 + 1.5, S1 + 3);
  const back = prog(t, S1 + 3.6, S1 + 4.4);
  const fx = lerp(80, sx + 4, reach) + lerp(0, 30, back);
  const fy = lerp(150, sy + 5, reach) + lerp(0, 80, back);
  const press = t >= S1 + 3 && t < S1 + 3.5 ? 1 : 0;
  r.push({ x: Math.round(fx), y: Math.round(fy) + press, w: 4, h: 8, c: C.peach });
  r.push({ x: Math.round(fx) - 1, y: Math.round(fy) + 6 + press, w: 8, h: 12, c: C.peach });
  r.push({ x: Math.round(fx) - 2, y: Math.round(fy) + 16 + press, w: 10, h: 40, c: C.lblue });
  if (press) r.push(...ring(sx + 5, sy + 4, 5, C.yellow));
  return r;
}

function ring(cx: number, cy: number, rad: number, c: string): Rect[] {
  const out: Rect[] = [];
  for (let a = 0; a < 360; a += 20) {
    out.push({ x: Math.round(cx + Math.cos((a * Math.PI) / 180) * rad), y: Math.round(cy + Math.sin((a * Math.PI) / 180) * rad), c });
  }
  return out;
}

// ---- cena 2: mapa visto de cima --------------------------------------------
const ROADS_Y = [30, 70, 110];
const ROADS_X = [18, 54];
const SOS = { x: 74, y: 112 };

function vanAt(i: number, t: number) {
  const d = t - S2;
  if (i === 0) return { x: lerp(-8, 52, d / 5), y: ROADS_Y[2] - 2 }; // vem pela rua de baixo
  if (i === 1) return { x: ROADS_X[0] - 2, y: lerp(150, 26, d / 7) };
  return { x: lerp(100, 30, d / 6), y: ROADS_Y[0] - 2 };
}

function mapScene(t: number): Rect[] {
  const r: Rect[] = [{ x: 0, y: 0, w: W, h: H, c: "#00A45A" }];
  // quarteirões (casas)
  for (let bx = 0; bx < W; bx += 12) {
    for (let by = 4; by < H; by += 14) {
      if ((bx * 7 + by * 3) % 5 === 0) r.push({ x: bx + 2, y: by, w: 6, h: 6, c: C.brown }, { x: bx + 2, y: by, w: 6, h: 2, c: C.red });
    }
  }
  for (const y of ROADS_Y) r.push({ x: 0, y, w: W, h: 5, c: C.lgray }, ...dash(0, y + 2, W, true));
  for (const x of ROADS_X) r.push({ x, y: 0, w: 5, h: H, c: C.lgray }, ...dash(x + 2, 0, H, false));
  // SOS pulsando
  if (t >= S2 + 2) {
    const pulse = (Math.floor(t * 3) % 3) + 3;
    r.push(...ring(SOS.x, SOS.y + 2, pulse * 2, C.red));
  }
  // linha amarela do mais perto até o SOS
  if (t >= S2 + 4.5) {
    const v = vanAt(0, t);
    r.push(...pixelLine(v.x + 3, v.y + 2, SOS.x, SOS.y + 3, C.yellow).filter((_, i) => i % 2 === 0));
  }
  return r;
}

function dash(x: number, y: number, len: number, horizontal: boolean): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < len; i += 6) out.push(horizontal ? { x: x + i, y, w: 3, h: 1, c: C.white } : { x, y: y + i, w: 1, h: 3, c: C.white });
  return out;
}

// ---- cena 3: desativado -----------------------------------------------------
function lockScene(t: number): Rect[] {
  const r: Rect[] = [...sky(C.navy, C.purple), ...stars(t)];
  // chave liga/desliga em OFF
  const sw = { x: 30, y: 84 };
  r.push({ x: sw.x, y: sw.y, w: 36, h: 12, c: C.black });
  r.push({ x: sw.x + 1, y: sw.y + 1, w: 34, h: 10, c: C.dgray });
  const knob = lerp(sw.x + 19, sw.x + 2, prog(t, S3 + 1, S3 + 1.6));
  r.push({ x: Math.round(knob), y: sw.y + 2, w: 15, h: 8, c: t >= S3 + 1.6 ? C.red : "#00E436" });
  return r;
}

// ---- cena 4: urna -----------------------------------------------------------
const BOX = { x: 52, y: 118, w: 28, h: 32 };
function urnaScene(t: number): Rect[] {
  const r: Rect[] = [...sky(C.navy, C.lavender), ...stars(t)];
  r.push({ x: BOX.x, y: BOX.y, w: BOX.w, h: BOX.h, c: C.black });
  r.push({ x: BOX.x + 1, y: BOX.y + 1, w: BOX.w - 2, h: BOX.h - 2, c: C.lgray });
  r.push({ x: BOX.x + 8, y: BOX.y + 2, w: 12, h: 2, c: C.black }); // fenda
  r.push({ x: BOX.x + 4, y: BOX.y + 12, w: BOX.w - 8, h: 8, c: C.lblue });
  // cadeadinho na urna
  r.push({ x: BOX.x + 11, y: BOX.y + 22, w: 6, h: 5, c: C.yellow }, { x: BOX.x + 12, y: BOX.y + 20, w: 4, h: 2, c: C.orange });
  return r;
}

// cada técnico entra, coloca o voto e sai
function voter(i: number, t: number) {
  const from = S4 + 0.3 + i * 2.4;
  const d = t - from;
  if (d < 0) return null;
  const at = BOX.x - 6;
  if (d < 1.0) return { x: lerp(-10, at, d / 1.0), walking: true, paper: null as null | { x: number; y: number } };
  if (d < 1.6) {
    const p = (d - 1.0) / 0.6;
    return { x: at, walking: false, paper: { x: lerp(at + 4, BOX.x + 12, p), y: lerp(GROUND - 14, BOX.y - 2, p) - Math.sin(p * Math.PI) * 10 } };
  }
  if (d < 3.0) return { x: lerp(at, 110, (d - 1.6) / 1.4), walking: true, paper: null };
  return null;
}

// ---- cena 5: final ----------------------------------------------------------
function endScene(t: number): Rect[] {
  return [...sky(C.navy, C.lavender), ...stars(t)];
}

export default function MapaTrailer({
  withSound,
  votedCount,
  eligibleCount,
}: {
  withSound: boolean;
  votedCount: number;
  eligibleCount: number;
}) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const s = (performance.now() - start) / 1000;
      setT(Math.min(MAPA_TRAILER_SECONDS, Math.floor(s * FPS) / FPS));
      if (s >= MAPA_TRAILER_SECONDS) clearInterval(id);
    }, 1000 / FPS);
    const stop = withSound ? playSong(MAPA_SONG) : null;
    return () => {
      clearInterval(id);
      stop?.();
    };
  }, [withSound]);

  return (
    <div className={pixelFont.className}>
      <MapaFrame t={t} votedCount={votedCount} eligibleCount={eligibleCount} />
    </div>
  );
}

export function MapaFrame({ t, votedCount, eligibleCount }: { t: number; votedCount: number; eligibleCount: number }) {
  const at = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  const bubble = "absolute -translate-x-1/2 whitespace-nowrap border-2 border-black bg-white px-1.5 py-1 text-[7px] leading-tight text-black";
  const caption = "absolute inset-x-[4%] border-2 border-black bg-black/80 px-2 py-1.5 text-center text-[7px] leading-relaxed text-white";
  const missing = Math.max(0, eligibleCount - votedCount);

  let bg: Rect[];
  const sprites: JSX.Element[] = [];
  if (t < S1) {
    bg = [...sky(C.navy, C.lavender), ...stars(t)];
    for (let i = 0; i < 3; i++) {
      const x = lerp(-12 - i * 14, 70 - i * 22, prog(t, 0.3, 3.2));
      sprites.push(tech(i, x, GROUND, t, t < 3.2));
    }
  } else if (t < S2) {
    bg = phoneScene(t);
  } else if (t < S3) {
    bg = mapScene(t);
    for (let i = 0; i < 3; i++) {
      const v = vanAt(i, t);
      sprites.push(<Sprite key={`van-${i}`} rows={VAN} palette={VAN_PAL} x={v.x} y={v.y} />);
    }
    if (t >= S2 + 2) sprites.push(<Sprite key="pin" rows={PIN} palette={PIN_PAL} x={SOS.x - 2} y={SOS.y - 4} />);
  } else if (t < S4) {
    bg = lockScene(t);
    const drop = prog(t, S3, S3 + 0.8);
    sprites.push(<Sprite key="lock" rows={LOCK} palette={LOCK_PAL} x={40} y={lerp(-20, 56, drop)} />);
    sprites.push(tech(0, 22, GROUND, t, false), tech(1, 48, GROUND, t, false), tech(2, 74, GROUND, t, false));
  } else if (t < S5) {
    bg = urnaScene(t);
    for (let i = 0; i < 3; i++) {
      const v = voter(i, t);
      if (!v) continue;
      sprites.push(tech(i, v.x, GROUND, t, v.walking));
      if (v.paper) sprites.push(<Pixels key={`paper-${i}`} rects={[{ x: Math.round(v.paper.x), y: Math.round(v.paper.y), w: 5, h: 3, c: C.white }]} />);
    }
  } else {
    bg = endScene(t);
    const hop = (i: number) => (Math.floor(t * 4 + i) % 2) * 3;
    sprites.push(tech(0, 22, GROUND - hop(0), t, false), tech(1, 48, GROUND - hop(1), t, false), tech(2, 74, GROUND - hop(2), t, false));
  }

  return (
    <div className="relative w-full select-none overflow-hidden" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" shapeRendering="crispEdges" aria-hidden>
        <Pixels rects={bg} />
        {sprites}
      </svg>

      {/* Cena 0: título */}
      {t < S1 && (
        <div className="absolute inset-x-0 top-[12%] px-2 text-center [text-shadow:2px_2px_0_#000]">
          <p className="text-[8px] text-[#29ADFF]">ATUALIZAÇÃO DO APP</p>
          <p className="mt-2 text-[13px] leading-snug text-yellow-300">MAPA DA</p>
          <p className="text-[13px] leading-snug text-yellow-300">EQUIPE</p>
          <p className="mt-3 text-[7px] leading-relaxed text-white">CHEGOU EM 17/11 E AGORA</p>
          <p className="text-[7px] leading-relaxed text-white">A EQUIPE VAI DECIDIR!</p>
        </div>
      )}

      {/* Cena 1: celular */}
      {t >= S1 && t < S2 && (
        <p className={caption} style={{ top: "1.5%" }}>
          {t < S1 + 3.4 ? "TOCANDO NO ÍCONE OS NO TOPO..." : "...ABRIA O MAPA DA EQUIPE!"}
        </p>
      )}

      {/* Cena 2: mapa */}
      {t >= S2 && t < S3 && (
        <>
          <p className={caption} style={{ top: "1.5%" }}>
            {t < S2 + 4.5 ? "CADA TÉCNICO APARECIA COMO UM CARRINHO, EM TEMPO REAL" : "NO SOS DROP, MOSTRAVA QUEM ESTÁ MAIS PERTO PARA AJUDAR"}
          </p>
          {t >= S2 + 2 && (
            <span className={bubble} style={at(SOS.x - 8, SOS.y + 10)}>
              SOS!
            </span>
          )}
          <p className={caption} style={{ bottom: "2%" }}>
            SÓ DAS {APOIO_START} ÀS {APOIO_END}, COM O APP ABERTO
          </p>
        </>
      )}

      {/* Cena 3: desativado */}
      {t >= S3 && t < S4 && (
        <>
          <p className={caption} style={{ top: "1.5%" }}>
            LOCALIZAÇÃO É UM DADO PESSOAL. NINGUÉM DEVE SER LOCALIZADO SEM A EQUIPE CONCORDAR.
          </p>
          {t >= S3 + 1.6 && (
            <p className="absolute inset-x-0 text-center text-[11px] text-[#FF004D] [text-shadow:2px_2px_0_#000]" style={{ top: "63%" }}>
              DESATIVADO
            </p>
          )}
          {t >= S3 + 2.6 && (
            <span className={bubble} style={at(48, 112)}>
              ATÉ A VOTAÇÃO!
            </span>
          )}
        </>
      )}

      {/* Cena 4: urna */}
      {t >= S4 && t < S5 && (
        <>
          <p className={caption} style={{ top: "1.5%" }}>
            CADA TÉCNICO ATIVO VOTA: SIM OU NÃO
          </p>
          <div className="absolute inset-x-[6%] top-[22%] border-2 border-yellow-300 bg-[#1D2B53]/90 p-2 text-center text-[7px] leading-loose text-white">
            <p className="text-yellow-300">🔒 VOTO SECRETO</p>
            <p>CRIPTOGRAFADO</p>
            <p>NINGUÉM VÊ SEU NOME</p>
            <p className="text-[#00E436]">SÓ O TOTAL SIM / NÃO</p>
          </div>
        </>
      )}

      {/* Cena 5: resultado + contagem */}
      {t >= S5 && (
        <div className="absolute inset-x-[5%] top-[6%] border-4 border-yellow-300 bg-[#1D2B53]/95 p-2.5 text-center text-[7px] leading-loose text-white shadow-[4px_4px_0_#000]">
          <p className="text-[9px] text-yellow-300">VOTAÇÃO DO MAPA</p>
          <p className="mt-1 text-[#00E436]">MAIORIA SIM:</p>
          <p>O MAPA VOLTA A FUNCIONAR</p>
          <p className="mt-1 text-[#FF004D]">MAIORIA NÃO OU EMPATE:</p>
          <p>A FUNÇÃO SAI DO APP</p>
          <p className="mt-1 text-[#FFA300]">QUANDO TODOS VOTAREM,</p>
          <p className="text-[#FFA300]">O APP ATUALIZA SOZINHO</p>
          {eligibleCount > 0 && (
            <div className="mt-2 border-2 border-white/60 p-1.5">
              <p>
                JÁ VOTARAM <span className="text-yellow-300">{votedCount}</span> DE {eligibleCount}
              </p>
              <p>
                FALTAM <span className="text-[#FF77A8]">{missing}</span>
              </p>
            </div>
          )}
          <p className="mt-2 text-[9px] text-[#00E436]">VOTE ABAIXO! ▼</p>
        </div>
      )}
    </div>
  );
}
