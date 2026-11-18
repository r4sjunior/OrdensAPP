"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MapaTrailer from "./MapaTrailer";
import { MAPA_POLL, fmtDay, type MapaVoteState } from "@/lib/voteConfig";

// Votação do mapa da equipe: o vídeo 8-bit abre sozinho uma vez (a partir do dia da
// votação) e pode ser visto de novo pela faixa no topo ou pela tela do /mapa.
// Mostra quantos técnicos ativos já votaram e quantos faltam.

const SEEN_KEY = `votacao:${MAPA_POLL.id}:video-visto`;
export const OPEN_VOTE_EVENT = "votacao-mapa:abrir";
const REFRESH_MS = 20_000;

function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // sem storage: na pior das hipóteses o vídeo abre de novo
  }
}

export default function MapaVote({ initial }: { initial: MapaVoteState }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(false);
  const [play, setPlay] = useState({ id: 0, sound: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/votacao", { cache: "no-store" });
      if (!res.ok) return;
      const next: MapaVoteState = await res.json();
      setState((prev) => {
        // Votação acabou de encerrar: recarrega a página para ligar/remover o mapa.
        if (prev.phase !== "closed" && next.phase === "closed") router.refresh();
        return next;
      });
    } catch {
      // sem rede: tenta depois
    }
  }, [router]);

  useEffect(() => setState(initial), [initial]);

  // Abre sozinho uma vez por aparelho, a partir do dia da votação.
  useEffect(() => {
    if (initial.phase !== "soon" && !alreadySeen()) setOpen(true);
    const onOpen = () => {
      setPlay((p) => ({ id: p.id + 1, sound: false }));
      setOpen(true);
    };
    window.addEventListener(OPEN_VOTE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_VOTE_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    markSeen();
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, refresh]);

  async function vote(choice: "sim" | "nao") {
    const label = choice === "sim" ? "SIM (aprovo o mapa)" : "NÃO (não aprovo o mapa)";
    if (!window.confirm(`Confirmar voto ${label}?\n\nO voto é secreto e não pode ser alterado depois.`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/votacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voto: choice }),
    }).catch(() => null);
    setBusy(false);
    if (!res) {
      setError("Sem internet: o voto não foi enviado. Tente de novo.");
      return;
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error ?? "Não foi possível registrar o voto.");
      refresh();
      return;
    }
    setState(body);
    if (body?.phase === "closed") router.refresh();
  }

  const missing = Math.max(0, state.eligibleCount - state.votedCount);
  const showBanner = state.phase === "open" && state.canVote && !state.voted;

  return (
    <>
      {/* Faixa no topo enquanto o técnico não votou */}
      {showBanner && !open && (
        <div className="mx-auto max-w-3xl px-2 pb-2 sm:px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-ink px-4 py-2.5 text-left text-sm text-white shadow-lg"
          >
            <span className="text-xl">🗳️</span>
            <span className="min-w-0 flex-1">
              <strong>Votação do mapa da equipe</strong>
              <span className="block text-xs text-white/80">
                Vote SIM ou NÃO · {state.votedCount} de {state.eligibleCount} já votaram · faltam {missing}
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-stamp px-2.5 py-1 text-xs font-bold">Votar</span>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[72] flex items-start justify-center overflow-y-auto bg-ink/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Votação do mapa da equipe"
          onClick={() => setOpen(false)}
        >
          <div className="my-auto w-full max-w-[min(24rem,calc((100vh-16rem)*0.6))] min-w-[16rem]" onClick={(e) => e.stopPropagation()}>
            <div className="border-4 border-black shadow-[6px_6px_0_#000]">
              <MapaTrailer
                key={play.id}
                withSound={play.sound}
                votedCount={state.votedCount}
                eligibleCount={state.eligibleCount}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPlay((p) => ({ id: p.id + 1, sound: true }))}
                className="btn-stamp flex-1 bg-paper px-3"
              >
                {play.sound ? "↻ Ver novamente" : "🔊 Ver com som"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1 bg-paper">
                Fechar
              </button>
            </div>

            <div className="mt-3 rounded-2xl bg-paper p-4 text-center">
              <p className="text-sm font-semibold text-ink">{MAPA_POLL.question}</p>

              {state.phase !== "soon" && state.eligibleCount > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white p-2 ring-1 ring-line">
                    <p className="font-mono text-2xl font-bold text-ink">{state.votedCount}</p>
                    <p className="text-[11px] text-inkSoft">já votaram</p>
                  </div>
                  <div className="rounded-xl bg-white p-2 ring-1 ring-line">
                    <p className="font-mono text-2xl font-bold text-stamp">{missing}</p>
                    <p className="text-[11px] text-inkSoft">faltam votar</p>
                  </div>
                </div>
              )}

              {state.phase === "soon" && (
                <p className="mt-2 text-sm text-inkSoft">A votação abre em {fmtDay(state.start)}.</p>
              )}

              {state.phase === "open" && state.canVote && !state.voted && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => vote("sim")}
                    className="flex-1 rounded-xl bg-teal px-3 py-3 font-display text-lg font-bold text-white shadow-md disabled:opacity-50"
                  >
                    👍 SIM
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => vote("nao")}
                    className="flex-1 rounded-xl bg-stamp px-3 py-3 font-display text-lg font-bold text-white shadow-md disabled:opacity-50"
                  >
                    👎 NÃO
                  </button>
                </div>
              )}

              {state.phase === "open" && state.voted && (
                <p className="mt-3 rounded-xl bg-teal/10 px-3 py-2 text-sm text-teal">
                  ✅ Seu voto foi registrado. Ele é secreto: ninguém sabe o que você votou.
                </p>
              )}

              {state.phase === "open" && !state.canVote && (
                <p className="mt-3 text-sm text-inkSoft">
                  Só votam os técnicos ativos (com OS registrada nos {MAPA_POLL.activeDays} dias antes de{" "}
                  {fmtDay(state.start)}).
                </p>
              )}

              {state.phase === "closed" && state.result && (
                <p className="mt-3 text-sm text-ink">
                  Votação encerrada: <strong>{state.result.yes}</strong> a favor e <strong>{state.result.no}</strong> contra.{" "}
                  {state.feature === "approved" ? "O mapa da equipe foi aprovado e está ligado." : "O mapa da equipe foi removido do app."}
                </p>
              )}

              {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <p className="mt-3 text-[11px] leading-snug text-inkSoft">
                🔒 Voto secreto: a contagem fica criptografada e nenhum nome é guardado junto do voto. No final aparece só o
                número de votos a favor e contra.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
