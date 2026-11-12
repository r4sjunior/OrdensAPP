"use client";

import { useEffect, useState } from "react";
import { UPDATES } from "@/lib/changelog";

const ROTATE_MS = 5000;
const RECENT = 5; // quantas atualizações giram na barra

function fmt(date: string) {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export default function StatusBar() {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const recent = UPDATES.slice(0, RECENT);

  useEffect(() => {
    if (open || recent.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % recent.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [open, recent.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (recent.length === 0) return null;
  const cur = recent[i % recent.length];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/30 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Últimas atualizações"
            className="max-h-[70vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-3xl sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Últimas atualizações</h2>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-3 py-1.5 text-xs">
                Fechar
              </button>
            </div>
            <ul className="space-y-3">
              {UPDATES.map((u, k) => (
                <li key={k} className="flex gap-3 text-sm">
                  <span className="w-12 shrink-0 font-mono text-xs leading-5 text-inkSoft">{fmt(u.date)}</span>
                  <span className="text-ink">{u.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="app-statusbar fixed inset-x-0 bottom-0 z-[55] border-t border-black/5 bg-white/80 pb-[env(safe-area-inset-bottom)] text-left backdrop-blur-xl"
        aria-label="Ver últimas atualizações do app"
      >
        <div className="mx-auto flex h-10 max-w-3xl items-center gap-2 px-4 text-xs sm:px-6">
          <span className="flex shrink-0 items-center gap-1.5 font-display font-bold uppercase tracking-wide text-stamp">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stamp" aria-hidden />
            Novidades
          </span>
          <span className="shrink-0 font-mono text-inkSoft">{fmt(cur.date)}</span>
          <span key={i} className="min-w-0 flex-1 truncate text-ink animate-[statusIn_0.4s_ease-out]">
            {cur.text}
          </span>
          <span className="shrink-0 text-inkSoft" aria-hidden>›</span>
        </div>
      </button>
    </>
  );
}
