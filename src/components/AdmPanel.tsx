"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DrawView, Participant } from "@/lib/draw";
import type { CampaignPhase } from "@/lib/campaign";
import DrawShow from "./DrawShow";
import { useDrawView } from "./useDrawView";

type HistoryItem = {
  id: string;
  createdAt: string;
  test: boolean;
  participants: number;
  winnerName: string;
  winnerImageUrl: string;
  winnerLuck: number;
};

function formatWeight(n: number) {
  return n.toFixed(1).replace(".", ",");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdmPanel({
  participants,
  openDraw,
  phase,
  campaignEnd,
  history,
}: {
  participants: Participant[];
  openDraw: DrawView | null;
  phase: CampaignPhase;
  campaignEnd: string;
  history: HistoryItem[];
}) {
  const router = useRouter();
  const [test, setTest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOpen, setShowOpen] = useState(true);
  const live = useDrawView(openDraw?.id ?? null);

  const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
  const totalLuck = participants.reduce((sum, p) => sum + p.luck, 0);

  async function valendo() {
    const msg = test
      ? "Fazer um sorteio de TESTE? Só aparece aqui no /adm."
      : `VALENDO! A roleta vai aparecer na tela de todo mundo que estiver com o app aberto e gira em 2 minutos.\n\n${participants.length} participantes. Confirmar?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/adm/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível começar o sorteio.");
      return;
    }
    setShowOpen(true);
    router.refresh();
  }

  async function closeDraw() {
    if (!openDraw) return;
    if (!window.confirm("Encerrar o sorteio e tirar a roleta da tela de todos? O resultado fica no histórico.")) return;
    await fetch("/api/adm/draw/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: openDraw.id }),
    });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/adm/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {openDraw && live && showOpen && (
        <DrawShow
          view={live.view}
          clockOffset={live.clockOffset}
          onClose={() => setShowOpen(false)}
          footer={
            <button
              type="button"
              onClick={closeDraw}
              className="w-full border-2 border-white px-4 py-3 text-sm text-white hover:bg-white hover:text-ink"
            >
              Encerrar sorteio (tirar da tela de todos)
            </button>
          }
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">🍺 Sorteio da Caixinha de Gela</h1>
          <p className="text-xs text-inkSoft">Área do adm</p>
        </div>
        <button type="button" onClick={logout} className="btn-ghost px-3 py-2 text-xs">
          Sair
        </button>
      </div>

      <section className="border-2 border-stamp bg-paper p-4 text-center sm:p-6">
        {openDraw ? (
          <>
            <p className="text-sm text-ink">
              {openDraw.test ? "Sorteio de teste em andamento." : "Sorteio na tela de todo mundo."}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setShowOpen(true)} className="btn-stamp flex-1">
                Abrir roleta
              </button>
              <button type="button" onClick={closeDraw} className="btn-ghost flex-1">
                Encerrar sorteio
              </button>
            </div>
          </>
        ) : (
          <>
            {phase !== "ended" && !test && (
              <p className="mb-3 text-xs text-stamp">
                Atenção: a campanha vai até {campaignEnd.split("-").reverse().slice(0, 2).join("/")}. Um sorteio
                valendo agora usa os tickets até hoje.
              </p>
            )}
            <label className="mb-4 flex items-center justify-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} />
              Teste (só aparece aqui no /adm)
            </label>
            <button
              type="button"
              onClick={valendo}
              disabled={busy || participants.length === 0}
              className="w-full rounded-sm border-4 border-ink bg-stamp px-6 py-5 font-display text-2xl font-bold uppercase tracking-widest text-paper shadow-[4px_4px_0_#1F2A2E] transition-transform active:translate-y-1 disabled:opacity-50"
            >
              {busy ? "Sorteando…" : test ? "Valendo (teste)" : "Valendo!"}
            </button>
            <p className="mt-3 text-xs text-inkSoft">
              O vencedor é sorteado na hora; a roleta gira 2 minutos depois para dar tempo de todo mundo abrir o app.
            </p>
          </>
        )}
        {error && <p className="mt-3 text-sm text-stamp">{error}</p>}
      </section>

      <section className="mt-6 border border-line bg-paper p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink">Na roda</h2>
        <p className="mb-4 text-xs text-inkSoft">
          {participants.length} cadastrados · {totalLuck} de sorte depositada · peso = 1 + √sorte
        </p>
        <ul className="divide-y divide-line border-y border-line">
          {participants.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{p.name}</p>
                <p className="text-[10px] text-inkSoft sm:text-xs">
                  {p.earned} tickets · sorte {p.luck} · peso {formatWeight(p.weight)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">
                {((p.weight / totalWeight) * 100).toFixed(1).replace(".", ",")}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section className="mt-6 border border-line bg-paper p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Histórico</h2>
          <ul className="divide-y divide-line border-y border-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.winnerImageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {h.winnerName} {h.test && <span className="text-xs text-stamp">(teste)</span>}
                  </p>
                  <p className="text-[10px] text-inkSoft sm:text-xs">
                    {formatDateTime(h.createdAt)} · {h.participants} na roda · sorte {h.winnerLuck}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
