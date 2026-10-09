"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DrawView } from "@/lib/draw";
import { sliceAtPointer, sliceGeometry, wheelAngle } from "@/lib/wheel";
import { beep, playSong, sharedAudio, unlockAudio, VICTORY_SONG } from "@/lib/chiptune";
import { pixelFont } from "@/lib/pixelFont";
import BeerRain from "./BeerRain";

// Show do sorteio em tela cheia: contagem de 2 min com a roleta girando devagar,
// giro valendo (igual em todos os aparelhos, pelo relógio do servidor) e o vencedor
// com chuva de cerveja e fanfarra 8-bit.

const SLICE_COLORS = ["#FF004D", "#FFA300", "#FFEC27", "#00E436", "#29ADFF", "#FF77A8", "#83769C", "#AB5236"];
const SIZE = 300;
const CX = SIZE / 2;
const R = 140;
const PLAY_RESULT_SOUND_WITHIN_MS = 30_000; // quem abre o app bem depois não ouve a fanfarra

type Phase = "countdown" | "spinning" | "result";

function point(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.sin(a), CX - radius * Math.cos(a)];
}

function slicePath(start: number, size: number) {
  if (size >= 359.999) return `M ${CX} ${CX - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CX - R} Z`;
  const [x1, y1] = point(start, R);
  const [x2, y2] = point(start + size, R);
  return `M ${CX} ${CX} L ${x1} ${y1} A ${R} ${R} 0 ${size > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

function formatClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function DrawShow({
  view,
  clockOffset,
  onClose,
  footer,
}: {
  view: DrawView;
  clockOffset: number; // relógio do servidor - relógio do aparelho
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const geometry = useMemo(() => sliceGeometry(view.slices.map((s) => s.weight)), [view.slices]);
  const wheelRef = useRef<SVGGElement>(null);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [remaining, setRemaining] = useState(view.spinAt - (Date.now() + clockOffset));
  const [soundOn, setSoundOn] = useState(() => sharedAudio() !== null);
  const me = view.slices.find((s) => s.isMe);
  const winner = view.winnerIndex !== null ? view.slices[view.winnerIndex] : null;

  // Laço de animação: gira a roleta direto no DOM (sem re-render a cada quadro).
  useEffect(() => {
    let raf = 0;
    let lastSlice = -1;
    let lastSecond = -1;
    let lastPhase: Phase | null = null;
    const input = { id: view.id, spinAt: view.spinAt, spinMs: view.spinMs, geometry, winnerIndex: view.winnerIndex };

    function frame() {
      const now = Date.now() + clockOffset;
      const angle = wheelAngle(input, now);
      wheelRef.current?.setAttribute("transform", `rotate(${angle} ${CX} ${CX})`);

      const done = view.winnerIndex !== null && now >= view.spinAt + view.spinMs;
      const p: Phase = now < view.spinAt ? "countdown" : done ? "result" : "spinning";
      const audio = sharedAudio();

      if (p !== lastPhase) {
        if (p === "result" && now - (view.spinAt + view.spinMs) < PLAY_RESULT_SOUND_WITHIN_MS) {
          if (audio) playSong(VICTORY_SONG, audio);
          navigator.vibrate?.([300, 100, 300, 100, 600]);
        }
        lastPhase = p;
        setPhase(p);
      }

      if (p === "countdown") {
        const second = Math.ceil((view.spinAt - now) / 1000);
        if (second !== lastSecond) {
          lastSecond = second;
          setRemaining(view.spinAt - now);
          // suspense: bipes subindo de tom nos últimos 10 segundos
          if (audio && second <= 10 && second > 0) beep(audio, 440 + (10 - second) * 70, 0.12);
        }
      }

      if (p === "spinning") {
        const slice = sliceAtPointer(geometry, angle);
        if (slice !== lastSlice) {
          if (audio && lastSlice !== -1) beep(audio, 1300, 0.025, 0.05);
          lastSlice = slice;
        }
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [view, geometry, clockOffset]);

  function enableSound() {
    const audio = unlockAudio();
    if (audio) beep(audio, 880, 0.15);
    setSoundOn(audio !== null);
  }

  const lastSeconds = phase === "countdown" && remaining <= 10_000;

  return (
    <div
      className={`${pixelFont.className} fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-[#1D2B53] px-4 pb-6 pt-4 text-center text-white`}
      role="dialog"
      aria-modal="true"
      aria-label="Sorteio da Caixinha de Gela"
    >
      {phase === "result" && <BeerRain />}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 border-2 border-white px-2 py-1 text-[10px] hover:bg-white hover:text-[#1D2B53]"
        aria-label="Fechar"
      >
        X
      </button>

      {view.test && (
        <p className="mb-2 bg-[#FF004D] px-2 py-1 text-[8px]">TESTE · SÓ O ADM ESTÁ VENDO</p>
      )}
      <p className="mt-6 text-[10px] text-[#FFEC27] sm:text-xs">SORTEIO DA</p>
      <h1 className="mb-4 text-sm text-[#FFEC27] [text-shadow:2px_2px_0_#FF004D] sm:text-lg">
        CAIXINHA DE GELA
      </h1>

      {phase !== "result" ? (
        <>
          <div className="relative w-full max-w-[min(22rem,52vh)]">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full drop-shadow-[4px_4px_0_#000]">
              <defs>
                {geometry.map((g, i) => {
                  const [x, y] = point(g.start + g.size / 2, R * 0.64);
                  return (
                    <clipPath key={i} id={`slice-img-${view.id}-${i}`}>
                      <circle cx={x} cy={y} r={avatarRadius(g.size)} />
                    </clipPath>
                  );
                })}
              </defs>
              <g ref={wheelRef}>
                {geometry.map((g, i) => (
                  <path
                    key={i}
                    d={slicePath(g.start, g.size)}
                    fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                    stroke={view.slices[i].isMe ? "#FFF1E8" : "#000"}
                    strokeWidth={view.slices[i].isMe ? 3 : 1.5}
                  />
                ))}
                {geometry.map((g, i) => {
                  const r = avatarRadius(g.size);
                  if (r < 7) return null; // fatia pequena demais para foto
                  const mid = g.start + g.size / 2;
                  const [x, y] = point(mid, R * 0.64);
                  return (
                    <g key={i}>
                      <image
                        href={view.slices[i].imageUrl}
                        x={x - r}
                        y={y - r}
                        width={r * 2}
                        height={r * 2}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#slice-img-${view.id}-${i})`}
                        transform={`rotate(${mid} ${x} ${y})`}
                      />
                      <circle cx={x} cy={y} r={r} fill="none" stroke="#000" strokeWidth={2} />
                    </g>
                  );
                })}
                <circle cx={CX} cy={CX} r={R} fill="none" stroke="#000" strokeWidth={6} />
              </g>
              {/* centro e ponteiro ficam parados */}
              <circle cx={CX} cy={CX} r={22} fill="#FFEC27" stroke="#000" strokeWidth={4} />
              <text x={CX} y={CX + 8} textAnchor="middle" fontSize="22">
                🍺
              </text>
              <polygon points={`${CX - 14},2 ${CX + 14},2 ${CX},34`} fill="#FF004D" stroke="#000" strokeWidth={3} />
            </svg>
          </div>

          {phase === "countdown" ? (
            <div className="mt-5">
              <p className="text-[9px] text-[#C2C3C7]">A ROLETA GIRA EM</p>
              <p
                className={`mt-2 tabular-nums ${
                  lastSeconds ? "animate-pulse text-5xl text-[#FF004D]" : "text-3xl text-white"
                }`}
              >
                {lastSeconds ? Math.max(1, Math.ceil(remaining / 1000)) : formatClock(remaining)}
              </p>
            </div>
          ) : (
            <p className="mt-6 animate-pulse text-xl text-[#FFEC27] [text-shadow:3px_3px_0_#FF004D]">
              VALENDOOO!
            </p>
          )}

          <p className="mt-5 text-[8px] leading-loose text-[#C2C3C7]">
            {view.slices.length} NA RODA
            {me && (
              <>
                <br />
                VOCÊ ESTÁ NA RODA · SUA SORTE: <span className="text-[#00E436]">{me.luck}</span>
              </>
            )}
          </p>

          {!soundOn && (
            <button
              type="button"
              onClick={enableSound}
              className="mt-5 border-4 border-black bg-[#FFA300] px-4 py-3 text-xs text-black shadow-[4px_4px_0_#000] active:translate-y-1"
            >
              🔊 TÔ DENTRO!
            </button>
          )}
        </>
      ) : (
        winner && (
          <div className="relative z-[1] mt-4 flex flex-col items-center">
            <p className="text-[10px] text-[#FFEC27]">🏆 GANHOU A CAIXINHA! 🏆</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winner.imageUrl}
              alt="Avatar do vencedor"
              className="mt-12 h-40 w-40 animate-bounce rounded-full border-8 border-[#FFEC27] object-cover shadow-[6px_6px_0_#000] sm:h-52 sm:w-52"
            />
            {winner.isMe && (
              <p className="mt-4 animate-pulse text-xl text-[#00E436] [text-shadow:3px_3px_0_#000]">
                É VOCÊ!!!
              </p>
            )}
            <p className="mt-5 border-4 border-black bg-[#FFF1E8] px-3 py-2 text-[10px] text-black shadow-[4px_4px_0_#000]">
              NÚMERO DE SORTE: <span className="text-[#FF004D]">{winner.luck}</span>
            </p>
            {!soundOn && (
              <button type="button" onClick={enableSound} className="mt-5 text-[9px] underline">
                🔊 LIGAR SOM
              </button>
            )}
          </div>
        )
      )}

      {footer && <div className="relative z-[1] mt-auto w-full max-w-md pt-6 font-body">{footer}</div>}
    </div>
  );
}

// Raio da foto dentro da fatia: cabe na largura da fatia (fatias pequenas, foto pequena).
function avatarRadius(sizeDeg: number) {
  const half = (Math.min(sizeDeg, 180) * Math.PI) / 360;
  return Math.min(26, R * 0.64 * Math.sin(half) * 0.85);
}
