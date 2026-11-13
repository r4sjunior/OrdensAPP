"use client";

import { useEffect, useRef, useState } from "react";
import type { MyCampaign } from "@/lib/tickets";
import { luckWeight, promoFor } from "@/lib/campaign";
import CampaignIntro from "./CampaignIntro";

function formatDay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function formatWeight(n: number) {
  return n.toFixed(1).replace(".", ",");
}

// Card da campanha "Caixinha de Gela" no Registrar: tickets ganhos, sorte depositada
// e o botão para depositar mais. `refreshKey` muda a cada ordem registrada/removida.
export default function CampaignCard({
  initial,
  refreshKey,
}: {
  initial: MyCampaign;
  refreshKey: number;
}) {
  const [data, setData] = useState(initial);
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    fetch("/api/campaign/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MyCampaign | null) => d && setData(d))
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    setAmount((a) => Math.min(Math.max(1, a), Math.max(1, data.available)));
  }, [data.available]);

  async function deposit() {
    if (amount <= 0 || amount > data.available) return;
    const ok = window.confirm(
      `Depositar ${amount} ${amount === 1 ? "ticket" : "tickets"} como sorte no sorteio?\n\nDepois de depositado não dá para desfazer.`
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Não foi possível depositar.");
        return;
      }
      setData(body as MyCampaign);
    } finally {
      setBusy(false);
    }
  }

  const { tickets, bonus } = data;
  // Até 30/11 a chamada; em 01/12 a vinheta de Natal; depois nenhum vídeo.
  const promo = promoFor(data.today);
  const previewWeight = luckWeight(data.effective + amount);

  return (
    <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/70 shadow-soft ring-1 ring-amber-400/50 sm:mb-10">
      {promo && <CampaignIntro key={promo} kind={promo} open={introOpen} onOpenChange={setIntroOpen} />}

      <button
        type="button"
        onClick={() => promo && setIntroOpen(true)}
        disabled={!promo}
        className="flex w-full items-center gap-3 border-b border-amber-500/20 px-4 py-3 text-left disabled:cursor-default sm:px-6"
      >
        <span className="text-3xl" aria-hidden>
          {promo === "natal" ? "🎄" : "🍺"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold leading-tight text-ink sm:text-lg">
            Sorteio da Caixinha de Gela
          </p>
          <p className="text-xs text-inkSoft">
            {formatDay(data.start)} a {formatDay(data.end)} às 20h · sorteio na confraternização
          </p>
        </div>
        {promo === "chamada" && <span className="shrink-0 text-xs text-stamp underline">▶ ver chamada</span>}
        {promo === "natal" && <span className="shrink-0 text-xs text-stamp underline">🎄 ver vinheta</span>}
      </button>

      <div className="px-4 py-5 sm:px-6">
        {data.phase === "before" ? (
          <div className="space-y-2 text-sm text-ink">
            <p>
              Começa dia <strong>{formatDay(data.start)}</strong>. Cada ordem registrada no dia vale{" "}
              <strong>1 ticket</strong>, e o 1º lugar ganha extra:
            </p>
            <ul className="space-y-0.5 pl-4 text-inkSoft">
              <li>🥇 do dia: +{bonus.daily}</li>
              <li>🥇 da semana: +{bonus.weekly}</li>
              <li>🥇 do mês: +{bonus.monthly}</li>
            </ul>
            <p className="text-inkSoft">
              Deposite seus tickets como sorte. Todo mundo entra na roleta; quem deposita mais
              sorte tem mais chance.
            </p>
            <button type="button" disabled className="btn-stamp mt-2 w-full">
              🍀 Depositar sorte · libera {formatDay(data.start)}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
              <div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
                  {tickets.earned}
                </div>
                <p className="mt-1 text-[9px] uppercase tracking-wide text-inkSoft sm:text-xs">
                  tickets ganhos
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-amber-700 sm:text-3xl">
                  {data.effective}
                </div>
                <p className="mt-1 text-[9px] uppercase tracking-wide text-inkSoft sm:text-xs">
                  sorte depositada
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
                  {formatWeight(data.weight)}
                </div>
                <p className="mt-1 text-[9px] uppercase tracking-wide text-inkSoft sm:text-xs">
                  peso na roleta
                </p>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-inkSoft">
              {tickets.orders} {tickets.orders === 1 ? "ordem" : "ordens"}
              {tickets.dailyWins > 0 && ` · ${tickets.dailyWins}× 1º do dia (+${tickets.dailyWins * bonus.daily})`}
              {tickets.weeklyWins > 0 && ` · ${tickets.weeklyWins}× 1º da semana (+${tickets.weeklyWins * bonus.weekly})`}
              {tickets.monthlyWins > 0 && ` · ${tickets.monthlyWins}× 1º do mês (+${tickets.monthlyWins * bonus.monthly})`}
            </p>
            <p className="mt-1 text-center text-[10px] text-inkSoft sm:text-xs">
              Bônus de 1º lugar entra quando o dia, a semana ou o mês fecha.
            </p>

            {data.deposited > data.effective && (
              <p className="mt-3 text-center text-xs text-stamp">
                Você depositou {data.deposited}, mas apagou ordens: valem só {data.effective}.
              </p>
            )}

            {data.phase === "ended" && (
              <p className="mt-5 border-t border-amber-500/40 pt-4 text-center text-sm text-ink">
                Depósitos encerrados em {formatDay(data.end)}. Boa sorte na roleta! 🍀
              </p>
            )}

            {data.phase === "active" && data.available > 0 && (
              <div className="mt-5 border-t border-amber-500/40 pt-4">
                <p className="mb-3 text-center text-sm text-ink">
                  Você tem <strong>{data.available}</strong>{" "}
                  {data.available === 1 ? "ticket disponível" : "tickets disponíveis"}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAmount((a) => Math.max(1, a - 1))}
                    className="btn-ghost px-3 py-1"
                    aria-label="Menos"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={data.available}
                    value={amount}
                    onChange={(e) =>
                      setAmount(Math.min(data.available, Math.max(1, Math.floor(Number(e.target.value) || 1))))
                    }
                    className="w-20 border-b border-line bg-transparent px-2 py-1 text-center font-mono text-lg text-ink"
                    aria-label="Quantidade de tickets"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount((a) => Math.min(data.available, a + 1))}
                    className="btn-ghost px-3 py-1"
                    aria-label="Mais"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(data.available)}
                    className="btn-ghost px-3 py-1 text-xs"
                  >
                    Tudo
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-inkSoft sm:text-xs">
                  Depositando {amount}, seu peso na roleta vai para {formatWeight(previewWeight)}
                </p>
                <button
                  type="button"
                  onClick={deposit}
                  disabled={busy}
                  className="btn-stamp mt-3 w-full"
                >
                  🍀 Depositar sorte
                </button>
              </div>
            )}

            {error && <p className="mt-3 text-center text-sm text-stamp">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
