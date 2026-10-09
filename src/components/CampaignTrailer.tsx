"use client";

import { useEffect, useMemo, useState } from "react";
import { CHAMADA_SONG, playSong } from "@/lib/chiptune";
import { BONUS, CAMPAIGN } from "@/lib/campaign";
import { pixelFont } from "@/lib/pixelFont";

// Chamada da campanha em pixel art (8-bit): três técnicos de capacete, cinto
// paraquedista e talabarte correm e sobem a escada laranja até a caixa de gela no
// topo do poste. Um escorrega e fica pendurado pelo talabarte; o mais rápido ergue a
// caixa e a espuma espirra. Tudo calculado a partir do tempo `t`, a 12 quadros/s.

const W = 96; // largura da cena em "pixels"
const H = 160;
const FPS = 12;
const PANEL_AT = 10.5; // segundos até aparecer o quadro com as regras

// Paleta estilo PICO-8.
const C = {
  black: "#000000",
  navy: "#1D2B53",
  purple: "#7E2553",
  green: "#008751",
  brown: "#AB5236",
  dgray: "#5F574F",
  lgray: "#C2C3C7",
  white: "#FFF1E8",
  red: "#FF004D",
  orange: "#FFA300",
  yellow: "#FFEC27",
  lblue: "#29ADFF",
  lavender: "#83769C",
  pink: "#FF77A8",
  peach: "#FFCCAA",
};

// Técnico (11×15). H capacete · L lanterna · S pele · K olho · U uniforme ·
// R cinto paraquedista · P calça · B bota · T talabarte · G mosquetão.
const TECH_TOP = [
  "....HHH....",
  "...HHHHHL..",
  "..HHHHHHHH.",
  "...SSKSK...",
  "...SSSSS...",
  "....SSS....",
  "..URUUURU..",
  ".SURRURRUS.",
  ".S.URRRU.S.",
  "T..URURU...",
  "T.RRRRRRR..",
];
const TECH_FRAMES = [
  [...TECH_TOP, "T..PR.RP...", "G..PP.PP...", "...PP.PP...", "..BBB.BBB.."],
  [...TECH_TOP, "T..PR.RP...", "G..PP.PP...", "...PP.BBB..", "..BBB......"],
];

// Caixa de cerveja (14×9): Y tampinha · A garrafa · N madeira · R faixa · W letreiro.
const CRATE = [
  "..Y..Y..Y..Y..",
  "..A..A..A..A..",
  "NNNNNNNNNNNNNN",
  "NRRRRRRRRRRRRN",
  "NRWWRWRWWRWWRN",
  "NRRRRRRRRRRRRN",
  "NNNNNNNNNNNNNN",
  "N.N..N..N..N.N",
  "NNNNNNNNNNNNNN",
];
const CRATE_PALETTE: Record<string, string> = { Y: C.yellow, A: C.brown, N: C.brown, R: C.red, W: C.white };

type Rect = { x: number; y: number; w?: number; h?: number; c: string };

function Pixels({ rects }: { rects: Rect[] }) {
  return (
    <>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w ?? 1} height={r.h ?? 1} fill={r.c} />
      ))}
    </>
  );
}

function spriteRects(rows: string[], palette: Record<string, string>): Rect[] {
  const out: Rect[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]];
      if (c) out.push({ x, y, c });
    }
  });
  return out;
}

function Sprite({ rows, palette, x, y }: { rows: string[]; palette: Record<string, string>; x: number; y: number }) {
  const rects = useMemo(() => spriteRects(rows, palette), [rows, palette]);
  return (
    <g transform={`translate(${Math.round(x)} ${Math.round(y)})`}>
      <Pixels rects={rects} />
    </g>
  );
}

// Linha de pixels (Bresenham), para escada, fios e talabarte.
function pixelLine(x0: number, y0: number, x1: number, y1: number, c: string): Rect[] {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const out: Rect[] = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ x: x0, y: y0, c });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return out;
}

const GROUND = 150;
const LADDER_TOP = 44;
// x do trilho esquerdo da escada na altura y (encostada no poste).
const lx = (y: number) => 44 + ((GROUND - y) * 16) / (GROUND - LADDER_TOP);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp01(p);
const prog = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

function staticScene(): Rect[] {
  const r: Rect[] = [];
  // céu de entardecer em faixas
  r.push({ x: 0, y: 0, w: W, h: 50, c: C.navy });
  r.push({ x: 0, y: 50, w: W, h: 35, c: C.lavender });
  r.push({ x: 0, y: 85, w: W, h: 30, c: C.pink });
  r.push({ x: 0, y: 115, w: W, h: 35, c: C.peach });
  // sol se pondo
  r.push({ x: 12, y: 120, w: 12, h: 8, c: C.yellow });
  r.push({ x: 14, y: 118, w: 8, h: 2, c: C.yellow });
  // chão
  r.push({ x: 0, y: GROUND, w: W, h: 2, c: C.green });
  r.push({ x: 0, y: GROUND + 2, w: W, h: H - GROUND - 2, c: C.brown });
  // poste e cruzeta
  r.push({ x: 68, y: 42, w: 4, h: GROUND - 42, c: C.lgray });
  r.push({ x: 71, y: 42, w: 1, h: GROUND - 42, c: C.dgray });
  r.push({ x: 50, y: 40, w: 41, h: 2, c: C.dgray });
  // fios
  r.push(...pixelLine(50, 41, 20, 52, C.black), ...pixelLine(20, 52, 0, 50, C.black));
  r.push(...pixelLine(90, 41, 96, 46, C.black));
  // escada laranja: dois trilhos e degraus
  for (let y = LADDER_TOP; y <= GROUND; y++) {
    r.push({ x: Math.round(lx(y)), y, c: C.orange });
    r.push({ x: Math.round(lx(y)) + 7, y, c: C.orange });
  }
  for (let y = GROUND - 4; y > LADDER_TOP; y -= 6) {
    r.push({ x: Math.round(lx(y)) + 1, y, w: 6, h: 1, c: C.orange });
  }
  return r;
}

const STARS = [[8, 6], [30, 12], [52, 4], [80, 10], [90, 24], [16, 30], [40, 26], [70, 20]];

// Posição (pés) de cada técnico no tempo t.
type Actor = { x: number; y: number; frame: number };

function onLadder(y: number) {
  return lx(y) + 4;
}

function runThenClimb(t: number, runFrom: number, runTo: number, climbTo: number, topY: number): Actor {
  const baseX = onLadder(GROUND);
  if (t < runTo) {
    return { x: lerp(-12, baseX, prog(t, runFrom, runTo)), y: GROUND, frame: Math.floor(t * 8) % 2 };
  }
  const y = lerp(GROUND, topY, prog(t, runTo, climbTo));
  const moving = t < climbTo;
  return { x: onLadder(y), y, frame: moving ? Math.floor(t * 4) % 2 : 0 };
}

function winner(t: number): Actor {
  if (t < 7.5) return runThenClimb(t, 0, 1.5, 7.5, LADDER_TOP);
  // sobe na cruzeta e vai até a caixa
  const p = prog(t, 7.5, 8.2);
  return { x: lerp(onLadder(LADDER_TOP), 70, p), y: lerp(LADDER_TOP, 40, p), frame: p < 1 ? Math.floor(t * 8) % 2 : 0 };
}

// Mesmo técnico, capacetes de cores diferentes.
const techPalette = (helmet: string) => ({
  H: helmet, L: C.yellow, S: C.peach, K: C.black, U: C.lblue, R: C.red, P: C.dgray, B: C.black, T: C.yellow, G: C.lgray,
});
const PALETTES = [techPalette(C.white), techPalette(C.yellow), techPalette("#00E436")];

const SLIP_AT = 5.0;
const SLIP_Y = 128;

// Relógio da animação (12 quadros/s) e música.
export default function CampaignTrailer({ withSound }: { withSound: boolean }) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      setT(Math.floor(((performance.now() - start) / 1000) * FPS) / FPS);
    }, 1000 / FPS);
    const stop = withSound ? playSong(CHAMADA_SONG) : null;
    return () => {
      clearInterval(id);
      stop?.();
    };
  }, [withSound]);

  return (
    <div className={pixelFont.className}>
      <TrailerFrame t={t} />
    </div>
  );
}

// Um quadro da animação no instante t (segundos).
export function TrailerFrame({ t }: { t: number }) {
  const scene = useMemo(staticScene, []);

  const t1 = winner(t);
  const t2 = runThenClimb(t, 0.4, 2.4, 7.0, 75);

  // Técnico 3: sobe devagar, escorrega e fica pendurado pelo talabarte, balançando.
  let t3: Actor;
  let rope: Rect[] = [];
  if (t < SLIP_AT) {
    t3 = runThenClimb(t, 0.8, 3.4, SLIP_AT, SLIP_Y);
  } else {
    const hookX = onLadder(SLIP_Y) + 1;
    const hookY = SLIP_Y - 15;
    const fall = prog(t, SLIP_AT, SLIP_AT + 0.3);
    const dt = Math.max(0, t - SLIP_AT - 0.3);
    const swing = fall < 1 ? 0 : Math.sin(dt * 5) * 8 * Math.exp(-dt * 0.25);
    const feetY = lerp(SLIP_Y, SLIP_Y + 16, fall);
    t3 = { x: hookX + swing, y: feetY, frame: Math.floor(t * 6) % 2 };
    rope = pixelLine(hookX, hookY, hookX + swing - 5, feetY - 5, C.navy);
    rope.push({ x: Math.round(hookX) - 1, y: hookY - 1, w: 2, h: 2, c: C.lgray }); // mosquetão no degrau
  }

  // Caixa: parada na cruzeta, depois erguida acima do capacete do vencedor.
  const lift = prog(t, 9.0, 9.4);
  const bob = lift >= 1 ? (Math.floor(t * 4) % 2) : 0;
  const crate = { x: lerp(77, t1.x - 7, lift), y: lerp(31, 11 - bob, lift) };

  // Espuma espirrando da caixa (partículas com trajetória fixa).
  const foam: Rect[] = [];
  if (t >= 9.0) {
    const dt = t - 9.0;
    for (let i = 0; i < 44; i++) {
      const born = (i % 7) * 0.15;
      const life = dt - born;
      if (life < 0 || life > 1.6) continue;
      const angle = -Math.PI / 2 + ((i * 37) % 100) / 100 - 0.5;
      const speed = 38 + ((i * 53) % 30);
      const x = crate.x + 7 + Math.cos(angle) * speed * life;
      const y = crate.y + Math.sin(angle) * speed * life + 45 * life * life;
      foam.push({ x: Math.round(x), y: Math.round(y), w: i % 3 === 0 ? 2 : 1, h: i % 3 === 0 ? 2 : 1, c: i % 4 === 0 ? C.yellow : C.white });
    }
  }

  // Vapor gelado em cima da caixa antes de ser aberta.
  const mist: Rect[] =
    t < 9.0
      ? [0, 1, 2].map((i) => ({ x: 79 + i * 4, y: 28 - ((Math.floor(t * 3) + i) % 3), c: C.lblue }))
      : [];

  const stars: Rect[] = STARS.filter((_, i) => (Math.floor(t * 2) + i) % 3 !== 0).map(([x, y]) => ({ x, y, c: C.white }));

  // Balões e textos em HTML por cima do SVG (posição em % da cena).
  const at = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  const bubble = "absolute -translate-x-1/2 whitespace-nowrap border-2 border-black bg-white px-1.5 py-1 text-[8px] leading-tight text-black";

  return (
    <div className="relative w-full select-none overflow-hidden" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" shapeRendering="crispEdges" aria-hidden>
        <Pixels rects={scene} />
        <Pixels rects={stars} />
        <Pixels rects={mist} />
        <Sprite rows={CRATE} palette={CRATE_PALETTE} x={crate.x} y={crate.y} />
        <Pixels rects={rope} />
        <Sprite rows={TECH_FRAMES[t3.frame]} palette={PALETTES[2]} x={t3.x - 5} y={t3.y - 15} />
        <Sprite rows={TECH_FRAMES[t2.frame]} palette={PALETTES[1]} x={t2.x - 5} y={t2.y - 15} />
        <Sprite rows={TECH_FRAMES[t1.frame]} palette={PALETTES[0]} x={t1.x - 5} y={t1.y - 15} />
        <Pixels rects={foam} />
      </svg>

      {t < 8.8 && (
        <p className="absolute inset-x-0 top-[3%] px-2 text-center text-[9px] leading-relaxed text-yellow-300 [text-shadow:2px_2px_0_#000]">
          QUEM CHEGA PRIMEIRO
          <br />
          NA GELA?
        </p>
      )}
      {t >= 5.4 && t < 9.5 && (
        <span className={bubble} style={at(26, 104)}>
          TALABARTE
          <br />
          SALVOU! :P
        </span>
      )}
      {t >= 7.0 && t < 9.0 && (
        <span className={bubble} style={at(36, 50)}>
          EI, ESPERA AÍ!
        </span>
      )}
      {t >= 9.0 && t < PANEL_AT + 0.5 && (
        <p
          className="absolute inset-x-0 text-center text-xl text-yellow-300 [text-shadow:3px_3px_0_#FF004D]"
          style={{ top: "28%", transform: `scale(${1 + 0.15 * (Math.floor(t * 6) % 2)})` }}
        >
          GELAAA!
        </p>
      )}

      {t >= PANEL_AT && (
        <div className="absolute inset-x-[6%] top-[22%] border-4 border-yellow-300 bg-[#1D2B53]/95 p-3 text-center text-[8px] leading-loose text-white shadow-[4px_4px_0_#000]">
          <p className="text-[10px] text-yellow-300">SORTEIO DA</p>
          <p className="mb-2 text-[11px] text-yellow-300">CAIXINHA DE GELA</p>
          <p>
            {CAMPAIGN.start.slice(8, 10)}/{CAMPAIGN.start.slice(5, 7)} A {CAMPAIGN.end.slice(8, 10)}/
            {CAMPAIGN.end.slice(5, 7)}
          </p>
          <p className="mt-2 text-[#FFA300]">1 ORDEM = 1 TICKET</p>
          <p>1º DO DIA +{BONUS.daily}</p>
          <p>1º DA SEMANA +{BONUS.weekly}</p>
          <p>1º DO MÊS +{BONUS.monthly}</p>
          <p className="mt-2 text-[#00E436]">DEPOSITE SUA SORTE!</p>
          <p className="mt-1 text-[#FF77A8]">SORTEIO NA CONFRATERNIZAÇÃO</p>
        </div>
      )}
    </div>
  );
}
