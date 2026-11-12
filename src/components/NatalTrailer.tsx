"use client";

import { useEffect, useMemo, useState } from "react";
import { NATAL_SONG, playSong } from "@/lib/chiptune";
import { CAMPAIGN } from "@/lib/campaign";
import { pixelFont } from "@/lib/pixelFont";
import {
  C,
  CRATE,
  Pixels,
  Sprite,
  TECH_FRAMES,
  lerp,
  pixelLine,
  prog,
  techPalette,
  type Rect,
} from "./CampaignTrailer";

// Vinheta de Natal (só no dia 01/12), no mesmo estilo 8-bit da chamada: os três
// técnicos montam a árvore de Natal. As partes da árvore descem e encaixam, o cabo
// drop vira pisca-pisca e o técnico da escada coloca a estrela no topo. No pé da
// árvore aparece a caixinha de gela de presente. 12 quadros/s, ~12s.

const W = 96;
const H = 160;
const FPS = 12;
const GROUND = 150;
const PANEL_AT = 10.5;

const TREE_X = 40; // centro da árvore
// Andares da árvore: topo, base, meia-largura no topo e na base, hora em que encaixa.
const TIERS = [
  { top: 112, bottom: 142, w0: 3, w1: 22, at: 1.5 },
  { top: 88, bottom: 118, w0: 2, w1: 17, at: 3.0 },
  { top: 64, bottom: 94, w0: 1, w1: 12, at: 4.5 },
];
const DARK_GREEN = "#065F3B";

// Bolinhas de cada andar (x relativo ao centro, y absoluto).
const BALLS: [number, number, number, string][] = [
  [0, -12, 136, C.red], [0, 9, 130, C.yellow], [0, -4, 124, C.lblue], [0, 15, 139, C.pink],
  [1, -8, 112, C.red], [1, 6, 106, C.pink], [1, 11, 115, C.yellow],
  [2, 3, 84, C.red], [2, -5, 90, C.yellow],
];

// Estrela (7×7).
const STAR = ["...Y...", "...Y...", "YYYYYYY", ".YYYYY.", "..YYY..", ".YY.YY.", "YY...YY"];
const STAR_PALETTE = { Y: C.yellow };

// Caixinha de gela de presente: mesma caixa da chamada, com laço vermelho.
const GIFT_PALETTE: Record<string, string> = { Y: C.yellow, A: C.brown, N: C.brown, R: C.red, W: C.white };

// Escada encostada no lado direito da árvore: base longe (x=74), topo perto (x=52, y=64).
const GIFT_X = TREE_X - 7; // presente centralizado no pé da árvore
const LADDER_TOP = 64;
const lx = (y: number) => 52 + ((y - LADDER_TOP) * 22) / (GROUND - LADDER_TOP);
const onLadder = (y: number) => lx(y) + 4;

const PALETTES = [techPalette(C.white), techPalette(C.yellow), techPalette("#00E436")];

type Actor = { x: number; y: number; frame: number };

function walk(t: number, from: number, to: number, x0: number, x1: number): Actor {
  const moving = t >= from && t < to;
  return { x: lerp(x0, x1, prog(t, from, to)), y: GROUND, frame: moving ? Math.floor(t * 8) % 2 : 0 };
}

// Técnico da escada: corre até a base e sobe devagar enquanto a árvore cresce.
function climber(t: number): Actor {
  const baseX = onLadder(GROUND);
  if (t < 1.4) return walk(t, 0, 1.4, -12, baseX);
  const y = lerp(GROUND, LADDER_TOP + 2, prog(t, 1.4, 7.0));
  return { x: onLadder(y), y, frame: t < 7.0 ? Math.floor(t * 4) % 2 : 0 };
}

function staticScene(): Rect[] {
  const r: Rect[] = [];
  // noite
  r.push({ x: 0, y: 0, w: W, h: 70, c: C.black });
  r.push({ x: 0, y: 70, w: W, h: 50, c: C.navy });
  r.push({ x: 0, y: 120, w: W, h: 30, c: C.purple });
  // lua
  r.push({ x: 78, y: 12, w: 8, h: 8, c: C.lgray });
  r.push({ x: 77, y: 14, w: 10, h: 4, c: C.lgray });
  r.push({ x: 82, y: 13, w: 3, h: 3, c: C.white });
  // casinhas ao longe com janelas acesas
  r.push({ x: 0, y: 128, w: 14, h: 22, c: C.dgray }, { x: 3, y: 133, w: 3, h: 3, c: C.yellow });
  r.push({ x: 80, y: 124, w: 16, h: 26, c: C.dgray }, { x: 84, y: 129, w: 3, h: 3, c: C.yellow });
  r.push({ x: 90, y: 136, w: 3, h: 3, c: C.orange });
  // chão com neve
  r.push({ x: 0, y: GROUND, w: W, h: 2, c: C.white });
  r.push({ x: 0, y: GROUND + 2, w: W, h: H - GROUND - 2, c: C.brown });
  // tronco
  r.push({ x: TREE_X - 3, y: 140, w: 6, h: GROUND - 140, c: C.brown });
  r.push({ x: TREE_X + 1, y: 140, w: 2, h: GROUND - 140, c: "#7A3B22" });
  return r;
}

function ladder(): Rect[] {
  const r: Rect[] = [];
  for (let y = LADDER_TOP; y <= GROUND; y++) {
    r.push({ x: Math.round(lx(y)), y, c: C.orange });
    r.push({ x: Math.round(lx(y)) + 7, y, c: C.orange });
  }
  for (let y = GROUND - 4; y > LADDER_TOP; y -= 6) r.push({ x: Math.round(lx(y)) + 1, y, w: 6, h: 1, c: C.orange });
  return r;
}

// Um andar da árvore (triângulo com sombra à direita e borda de neve).
function tierRects(i: number, dy: number): Rect[] {
  const { top, bottom, w0, w1 } = TIERS[i];
  const r: Rect[] = [];
  for (let y = top; y <= bottom; y++) {
    const half = Math.round(w0 + ((w1 - w0) * (y - top)) / (bottom - top));
    r.push({ x: TREE_X - half, y: y + dy, w: half, h: 1, c: C.green });
    r.push({ x: TREE_X, y: y + dy, w: half, h: 1, c: DARK_GREEN });
  }
  // neve na barra do andar
  r.push({ x: TREE_X - w1, y: bottom + dy, w: w1 * 2, h: 1, c: C.white });
  for (const [tier, bx, by, c] of BALLS) {
    if (tier === i) r.push({ x: TREE_X + bx, y: by + dy, w: 2, h: 2, c });
  }
  return r;
}

// Caminho do pisca-pisca: zigue-zague de baixo para cima nos três andares.
const GARLAND: [number, number][] = [
  [TREE_X + 20, 140], [TREE_X - 18, 128], [TREE_X + 14, 118],
  [TREE_X - 13, 108], [TREE_X + 10, 96], [TREE_X - 8, 86], [TREE_X + 5, 76],
];
const BULBS = [C.red, C.yellow, C.lblue, C.pink, "#00E436"];

function garland(t: number): Rect[] {
  const from = 5.4;
  const to = 7.2;
  if (t < from) return [];
  // pontos do cabo, na ordem
  const pts: Rect[] = [];
  for (let i = 0; i < GARLAND.length - 1; i++) {
    const [x0, y0] = GARLAND[i];
    const [x1, y1] = GARLAND[i + 1];
    const seg = pixelLine(x0, y0, x1, y1, C.black);
    pts.push(...(i === 0 ? seg : seg.slice(1)));
  }
  const shown = Math.floor(pts.length * prog(t, from, to));
  const out: Rect[] = pts.slice(0, shown);
  const blink = Math.floor(t * 4);
  for (let k = 0; k < shown; k += 4) {
    const on = t < to || (k / 4 + blink) % 3 !== 0;
    out.push({ x: pts[k].x, y: pts[k].y, c: on ? BULBS[(k / 4) % BULBS.length] : C.dgray });
  }
  return out;
}

function snow(t: number): Rect[] {
  const r: Rect[] = [];
  for (let i = 0; i < 46; i++) {
    const speed = 9 + (i % 4) * 4;
    const y = Math.floor((i * 37 + t * speed) % GROUND);
    const x = Math.floor((i * 23 + Math.sin(t * 1.5 + i) * 2 + W) % W);
    r.push({ x, y, c: i % 5 === 0 ? C.lgray : C.white });
  }
  return r;
}

export default function NatalTrailer({ withSound }: { withSound: boolean }) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      setT(Math.floor(((performance.now() - start) / 1000) * FPS) / FPS);
    }, 1000 / FPS);
    const stop = withSound ? playSong(NATAL_SONG) : null;
    return () => {
      clearInterval(id);
      stop?.();
    };
  }, [withSound]);

  return (
    <div className={pixelFont.className}>
      <NatalFrame t={t} />
    </div>
  );
}

// Um quadro da vinheta no instante t (segundos).
export function NatalFrame({ t }: { t: number }) {
  const scene = useMemo(staticScene, []);
  const ladderRects = useMemo(ladder, []);

  // Andares descem do céu e encaixam (com um quique de 1 pixel ao encostar).
  const tiers: Rect[] = [];
  TIERS.forEach((tier, i) => {
    if (t < tier.at - 0.6) return;
    const p = prog(t, tier.at - 0.6, tier.at);
    const bounce = t >= tier.at && t < tier.at + 0.17 ? -1 : 0;
    tiers.push(...tierRects(i, Math.round(lerp(-tier.bottom - 4, 0, p * p)) + bounce));
  });

  const t1 = climber(t);
  const t2 = walk(t, 0.3, 1.6, -12, 22); // segura a base pela esquerda
  const t3 = walk(t, 0.6, 2.2, -12, 8); // solta o pisca-pisca

  // Estrela: na mão do técnico da escada, depois vai para o topo da árvore.
  const starMove = prog(t, 7.8, 8.6);
  const star =
    t >= 7.0
      ? { x: lerp(t1.x - 3, TREE_X - 3, starMove), y: lerp(t1.y - 24, 56, starMove) }
      : null;
  const shine: Rect[] = [];
  if (t >= 9.0) {
    const dt = t - 9.0;
    const len = 4 + (Math.floor(t * 6) % 2) * 3;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      const d = 6 + Math.min(dt, 0.5) * 8;
      shine.push(...pixelLine(TREE_X + Math.cos(a) * d, 59 + Math.sin(a) * d, TREE_X + Math.cos(a) * (d + len), 59 + Math.sin(a) * (d + len), C.yellow));
    }
  }

  const gift = t >= 9.0;
  const gela: Rect[] = gift
    ? [
        { x: GIFT_X + 6, y: 141, w: 2, h: 9, c: C.red }, // fita vertical
        { x: GIFT_X + 4, y: 137, w: 2, h: 2, c: C.red }, // laço
        { x: GIFT_X + 8, y: 137, w: 2, h: 2, c: C.red },
        { x: GIFT_X + 6, y: 138, w: 2, h: 2, c: C.pink },
      ]
    : [];

  const at = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  const bubble = "absolute -translate-x-1/2 whitespace-nowrap border-2 border-black bg-white px-1.5 py-1 text-[8px] leading-tight text-black";

  return (
    <div className="relative w-full select-none overflow-hidden" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" shapeRendering="crispEdges" aria-hidden>
        <Pixels rects={scene} />
        <Pixels rects={tiers} />
        <Pixels rects={garland(t)} />
        <Pixels rects={ladderRects} />
        {gift && <Sprite rows={CRATE} palette={GIFT_PALETTE} x={GIFT_X} y={141} />}
        <Pixels rects={gela} />
        <Sprite rows={TECH_FRAMES[t3.frame]} palette={PALETTES[2]} x={t3.x - 5} y={t3.y - 15} />
        <Sprite rows={TECH_FRAMES[t2.frame]} palette={PALETTES[1]} x={t2.x - 5} y={t2.y - 15} />
        <Sprite rows={TECH_FRAMES[t1.frame]} palette={PALETTES[0]} x={t1.x - 5} y={t1.y - 15} />
        {star && <Sprite rows={STAR} palette={STAR_PALETTE} x={star.x} y={star.y} />}
        <Pixels rects={shine} />
        <Pixels rects={snow(t)} />
      </svg>

      {t < 8.8 && (
        <p className="absolute inset-x-0 top-[3%] px-2 text-center text-[9px] leading-relaxed text-yellow-300 [text-shadow:2px_2px_0_#000]">
          BORA MONTAR
          <br />
          A ÁRVORE!
        </p>
      )}
      {t >= 1.8 && t < 4.6 && (
        <span className={bubble} style={at(22, 98)}>
          SEGURA FIRME!
        </span>
      )}
      {t >= 5.6 && t < 8.6 && (
        <span className={bubble} style={at(24, 110)}>
          O DROP VIROU
          <br />
          PISCA-PISCA!
        </span>
      )}
      {t >= 9.0 && t < PANEL_AT + 0.5 && (
        <p
          className="absolute inset-x-0 text-center text-lg leading-snug text-yellow-300 [text-shadow:3px_3px_0_#FF004D]"
          style={{ top: "16%", transform: `scale(${1 + 0.12 * (Math.floor(t * 6) % 2)})` }}
        >
          FELIZ
          <br />
          NATAL!
        </p>
      )}

      {t >= PANEL_AT && (
        <div className="absolute inset-x-[6%] top-[20%] border-4 border-[#FF004D] bg-[#1D2B53]/95 p-3 text-center text-[8px] leading-loose text-white shadow-[4px_4px_0_#000]">
          <p className="text-[11px] text-[#FF004D]">FELIZ NATAL</p>
          <p className="mb-2 text-[10px] text-[#00E436]">EQUIPE!</p>
          <p>DEZEMBRO CHEGOU</p>
          <p>E A ÁRVORE TÁ DE PÉ!</p>
          <p className="mt-2 text-yellow-300">CAIXINHA DE GELA</p>
          <p>
            ATÉ {CAMPAIGN.end.slice(8, 10)}/{CAMPAIGN.end.slice(5, 7)}: REGISTRE SUAS OS!
          </p>
          <p className="mt-2 text-[#FF77A8]">SORTEIO NA CONFRATERNIZAÇÃO</p>
          <p className="mt-1 text-[#FFA300]">BOAS FESTAS!</p>
        </div>
      )}
    </div>
  );
}
