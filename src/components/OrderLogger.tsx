"use client";

import { useState, useTransition } from "react";
import { todayISO } from "@/lib/dates";
import { campaignPhase } from "@/lib/campaign";
import type { MyCampaign } from "@/lib/tickets";
import CampaignCard from "./CampaignCard";

type Order = { id: string; date: string; createdAt: string };
type Stats = {
  totalOrders: number;
  firstDate: string | null;
  daysSpan: number;
  workedDays: number;
  average: number;
};

function formatAverage(n: number) {
  return n.toFixed(1).replace(".", ",");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function OrderLogger({
  initialDate,
  initialOrders,
  initialStats,
  initialCampaign,
  lateDates = [],
}: {
  initialDate: string;
  initialOrders: Order[];
  initialStats: Stats;
  initialCampaign: MyCampaign;
  lateDates?: string[]; // dias passados liberados pelo adm para este técnico
}) {
  const [date, setDate] = useState(initialDate);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Muda a cada ordem registrada/removida para o card da campanha recarregar os tickets.
  const [campaignKey, setCampaignKey] = useState(0);

  async function loadDay(nextDate: string) {
    setError(null);
    const from = nextDate;
    const to = nextDate;
    const res = await fetch(`/api/orders?from=${from}&to=${to}`);
    if (!res.ok) {
      setError("Não foi possível carregar os registros.");
      return;
    }
    const data: Order[] = await res.json();
    setOrders(data);
  }

  // Busca a média atualizada no servidor, refletindo o total geral após cada mudança.
  async function loadStats() {
    const res = await fetch("/api/orders/stats");
    if (res.ok) {
      const data: Stats = await res.json();
      setStats(data);
    }
  }

  function handleDateChange(nextDate: string) {
    setDate(nextDate);
    startTransition(() => loadDay(nextDate));
  }

  function handleRegister() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Não foi possível registrar a ordem.");
        return;
      }
      const created: Order = await res.json();
      setOrders((prev) => [created, ...prev]);
      setCampaignKey((k) => k + 1);
      await loadStats();
    });
  }

  function handleDelete(id: string) {
    setError(null);
    const prev = orders;
    setOrders((cur) => cur.filter((o) => o.id !== id));
    startTransition(async () => {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Não foi possível remover o registro.");
        setOrders(prev);
        return;
      }
      setCampaignKey((k) => k + 1);
      await loadStats();
    });
  }

  const isToday = date === todayISO();
  // Durante a campanha os pódios valem tickets, então só dá para registrar no dia.
  // Exceção: dias que o adm liberou para lançamento atrasado.
  const releasedDay = !isToday && lateDates.includes(date);
  const lockedPastDay = !isToday && campaignPhase() === "active" && !releasedDay;

  return (
    <div>
      {/* Depois do fim da campanha (a partir de 12/12) o card do sorteio some sozinho. */}
      {initialCampaign.phase !== "ended" && (
        <CampaignCard initial={initialCampaign} refreshKey={campaignKey} />
      )}

      <div className="card mb-8 flex flex-col items-center gap-5 px-4 py-8 text-center sm:mb-10 sm:gap-6 sm:px-8 sm:py-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => handleDateChange(dayBefore(date))}
            className="btn-ghost px-3 py-1"
            aria-label="Dia anterior"
          >
            ‹
          </button>
          <div className="flex flex-col items-center">
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-[9.5rem] border-b border-line bg-transparent px-2 py-1 text-center font-mono text-sm text-ink sm:w-auto"
            />
            <span className="mt-1 text-xs text-inkSoft">
              {isToday ? "hoje" : formatDateBR(date)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDateChange(dayAfter(date))}
            disabled={isToday}
            className="btn-ghost px-3 py-1 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Próximo dia"
          >
            ›
          </button>
        </div>

        <div>
          <div
            key={orders.length}
            className="animate-pop-in bg-gradient-to-br from-ink to-inkSoft bg-clip-text font-mono text-6xl font-semibold tabular-nums text-transparent sm:text-7xl"
          >
            {orders.length}
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-inkSoft">
            {orders.length === 1 ? "ordem registrada" : "ordens registradas"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegister}
          disabled={isPending || lockedPastDay}
          className="btn-stamp w-full py-4 text-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-10"
        >
          + Registrar ordem
        </button>

        {releasedDay && campaignPhase() === "active" && (
          <p className="-mt-2 text-xs text-emerald-700">
            ✅ Lançamento liberado pelo adm para este dia.
          </p>
        )}

        {lockedPastDay && (
          <p className="-mt-2 text-xs text-inkSoft">
            Durante a campanha da Caixinha de Gela só dá para registrar ordens de hoje.
          </p>
        )}

        {error && <p className="text-sm text-stamp">{error}</p>}

        <div className="grid w-full grid-cols-3 gap-2 pt-1 sm:gap-4 [&>div]:rounded-2xl [&>div]:bg-paper [&>div]:px-1 [&>div]:py-3 [&>div]:ring-1 [&>div]:ring-black/5">
          <div>
            <div className="font-mono text-lg font-semibold tabular-nums text-ink sm:text-2xl">
              {formatAverage(stats.average)}
            </div>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-inkSoft sm:text-xs">
              média do mês (ordens/dia)
            </p>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold tabular-nums text-ink sm:text-2xl">
              {stats.workedDays}
            </div>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-inkSoft sm:text-xs">
              dias trabalhados no mês
            </p>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold tabular-nums text-ink sm:text-2xl">
              {stats.totalOrders}
            </div>
            <p className="mt-1 text-[9px] uppercase tracking-wide text-inkSoft sm:text-xs">
              total do mês
            </p>
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="card animate-fade-in overflow-hidden">
          <div className="border-b border-line px-4 py-3 text-xs uppercase tracking-wide text-inkSoft sm:px-5">
            Registros de {formatDateBR(date)}
          </div>
          <ul>
            {orders
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((o, i) => (
                <li
                  key={o.id}
                  className={`flex items-center justify-between px-4 py-3 text-sm sm:px-5 ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <span className="text-inkSoft">
                    Ordem #{orders.length - i}
                  </span>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="font-mono text-ink">
                      {formatTime(o.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(o.id)}
                      className="text-xs text-inkSoft hover:text-stamp"
                    >
                      remover
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function dayBefore(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dayAfter(iso: string) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
