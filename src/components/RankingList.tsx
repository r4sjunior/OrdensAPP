"use client";

import { useEffect, useState } from "react";

type Entry = { position: number; orders: number; isMe: boolean; avatarUrl: string | null };

// Foto de quem adicionou avatar em /perfil; os outros ficam com um ícone neutro.
function Avatar({ url, size, ring }: { url: string | null; size: number; ring?: string }) {
  const style = { width: size, height: size, borderColor: ring };
  if (!url) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full border-2 border-line bg-paperDim text-inkSoft"
        style={style}
        aria-hidden
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="8" r="4.5" />
          <path d="M3.5 21a8.5 8.5 0 0 1 17 0Z" />
        </svg>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="shrink-0 rounded-full border-2 border-line object-cover"
      style={style}
    />
  );
}

const TROPHY_COLOR: Record<number, string> = {
  1: "#D4A017", // ouro
  2: "#9CA3AF", // prata
  3: "#B0703C", // bronze
};

// Altura do degrau do pódio por posição.
const STEP_HEIGHT: Record<number, string> = {
  1: "h-28",
  2: "h-20",
  3: "h-14",
};

function Trophy({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" fill={color} fillOpacity="0.25" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

// Degrau do pódio: gradiente metálico de cada posição.
const STEP_GRADIENT: Record<number, string> = {
  1: "linear-gradient(180deg, #F7D774 0%, #D4A017 55%, #A87C0C 100%)",
  2: "linear-gradient(180deg, #E5E7EB 0%, #9CA3AF 60%, #6B7280 100%)",
  3: "linear-gradient(180deg, #E3A774 0%, #B0703C 60%, #84501F 100%)",
};

// Ordem em que sobem: 3º, 2º e por último o 1º (o mais esperado).
const RISE_DELAY: Record<number, number> = { 3: 0, 2: 180, 1: 360 };

// Número que sobe de 0 até o valor (respeita quem prefere menos movimento).
function useCountUp(target: number, delay: number, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => (frame = requestAnimationFrame(tick)), delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, delay, ms]);
  return value;
}

function PodiumSpot({ p, e }: { p: number; e: Entry | undefined }) {
  const delay = RISE_DELAY[p];
  const count = useCountUp(e?.orders ?? 0, delay + 400);
  const first = p === 1;
  return (
    <div className="flex w-24 flex-col items-center sm:w-28">
      {e ? (
        <div className="relative animate-pop-in" style={{ animationDelay: `${delay + 500}ms` }}>
          {first && (
            <>
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 animate-float text-2xl drop-shadow" aria-hidden>
                👑
              </span>
              <span className="absolute -left-4 top-1 animate-sparkle text-sm text-amber-400" aria-hidden>
                ✦
              </span>
              <span className="absolute -right-4 top-6 animate-sparkle text-xs text-amber-400 [animation-delay:1.2s]" aria-hidden>
                ✦
              </span>
            </>
          )}
          <div className={`rounded-full p-[3px] shadow-lg ${first ? "animate-float" : ""}`} style={{ background: STEP_GRADIENT[p] }}>
            <Avatar url={e.avatarUrl} size={first ? 60 : 46} ring="white" />
          </div>
          <span className="absolute -bottom-2 -right-3">
            <Trophy color={TROPHY_COLOR[p]} size={first ? 28 : 22} />
          </span>
        </div>
      ) : (
        <div className="animate-fade-in opacity-25" style={{ animationDelay: `${delay + 500}ms` }}>
          <Trophy color={TROPHY_COLOR[p]} size={first ? 48 : 38} />
        </div>
      )}
      <span className={`mt-2 font-mono text-xl font-semibold tabular-nums ${e ? "text-ink" : "text-inkSoft"}`}>
        {e ? count : "–"}
      </span>
      <span className="mb-1 h-4 text-xs font-semibold text-stamp">{e?.isMe ? "Você" : ""}</span>
      <div
        className={`relative flex w-full origin-bottom animate-rise items-start justify-center overflow-hidden rounded-t-2xl pt-2 font-display text-2xl font-bold text-white shadow-lg [text-shadow:0_1px_2px_rgb(0_0_0/0.25)] ${STEP_HEIGHT[p]}`}
        style={{ background: STEP_GRADIENT[p], animationDelay: `${delay}ms` }}
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/50 to-transparent" style={{ animationDelay: `${delay + 900}ms` }} aria-hidden />
        <span className="relative">{p}º</span>
      </div>
    </div>
  );
}

// Pódio clássico: 2º à esquerda, 1º no centro (mais alto), 3º à direita. Os degraus
// sobem um de cada vez, as fotos aparecem em seguida e o 1º ganha coroa e brilho.
function Podium({ entries }: { entries: Entry[] }) {
  const byPosition = (p: number) => entries.find((e) => e.position === p);
  return (
    <div className="flex items-end justify-center gap-2 pt-8 sm:gap-3">
      {[2, 1, 3].map((p) => (
        <PodiumSpot key={p} p={p} e={byPosition(p)} />
      ))}
    </div>
  );
}

// Ranking anônimo: só posição e número de ordens; o usuário logado aparece como "Você".
export default function RankingList({
  type,
  date,
  top,
  title,
  subtitle,
}: {
  type: "daily" | "weekly" | "monthly" | "general";
  date?: string;
  top?: number;
  title: string;
  subtitle: string;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    const params = new URLSearchParams({ type });
    if (date && type !== "general") params.set("date", date);
    if (top) params.set("top", String(top));
    const qs = params.toString();
    fetch(`/api/orders/ranking?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [type, date, top]);

  // Pódio para os rankings top 3 (diário, semanal e campeões do mês); lista para o resto.
  const showPodium = type === "daily" || type === "weekly" || top === 3;

  return (
    <div className="mt-6 card p-4 sm:p-8">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mb-4 text-xs text-inkSoft">{subtitle}</p>

      {entries === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-paperDim" aria-label="Carregando…" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-inkSoft">Nenhuma ordem registrada no período.</p>
      ) : showPodium ? (
        <Podium entries={entries} />
      ) : (
        <ol className="space-y-1.5">
          {entries.map((e, i) => (
            <li
              key={e.position}
              className={`flex animate-slide-up items-center justify-between rounded-2xl px-3 py-2.5 ring-1 ${
                e.isMe ? "bg-stamp/10 ring-stamp/30" : "bg-paper ring-black/5"
              }`}
              style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 font-display text-lg font-bold text-stamp">
                  {e.position}º
                </span>
                <Avatar url={e.avatarUrl} size={32} />
                {e.isMe && <span className="text-xs font-medium text-ink">Você</span>}
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums text-ink">
                {e.orders}{" "}
                <span className="font-body text-xs font-normal text-inkSoft">ordens</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
