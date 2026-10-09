"use client";

import { useEffect, useState } from "react";
import type { DrawView } from "@/lib/draw";

type State = { view: DrawView; clockOffset: number } | null;

async function fetchDraw(drawId: string) {
  const sent = Date.now();
  const res = await fetch(`/api/draw/current?id=${encodeURIComponent(drawId)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data: { draw: DrawView | null; serverNow: number } = await res.json();
  const received = Date.now();
  if (!data.draw) return null;
  // diferença entre o relógio do servidor e o do aparelho (metade do tempo de ida e volta)
  return { view: data.draw, clockOffset: data.serverNow - (sent + received) / 2 };
}

// Busca o sorteio `drawId` e, enquanto o vencedor não chegou (ele só é liberado
// alguns segundos antes do giro), busca de novo na hora certa.
export function useDrawView(drawId: string | null): State {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    setState(null);
    if (!drawId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      const next = await fetchDraw(drawId!).catch(() => null);
      if (cancelled) return;
      if (next) setState(next);
      if (!next || next.view.winnerIndex === null) {
        const serverNow = Date.now() + (next?.clockOffset ?? 0);
        const untilReveal = next ? next.view.spinAt - 5_000 - serverNow : 0;
        timer = setTimeout(load, Math.max(1_500, untilReveal));
      }
    }
    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [drawId]);

  return state;
}
