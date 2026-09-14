"use client";

import { useState, useTransition } from "react";

type Order = { id: string; date: string; createdAt: string };
type Stats = {
  totalOrders: number;
  firstDate: string | null;
  daysSpan: number;
  average: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
}: {
  initialDate: string;
  initialOrders: Order[];
  initialStats: Stats;
}) {
  const [date, setDate] = useState(initialDate);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        setError("Não foi possível registrar a ordem.");
        return;
      }
      const created: Order = await res.json();
      setOrders((prev) => [created, ...prev]);
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
      await loadStats();
    });
  }

  const isToday = date === todayISO();

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-5 border border-line bg-paper px-4 py-8 text-center sm:mb-10 sm:gap-6 sm:px-8 sm:py-10">
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
          <div className="font-mono text-5xl font-semibold tabular-nums text-ink sm:text-6xl">
            {orders.length}
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-inkSoft">
            {orders.length === 1 ? "ordem registrada" : "ordens registradas"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleRegister}
          disabled={isPending}
          className="btn-stamp w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          + Registrar ordem
        </button>

        {error && <p className="text-sm text-stamp">{error}</p>}

        <div className="grid w-full grid-cols-2 gap-4 border-t border-line pt-5 sm:pt-6">
          <div>
            <div className="font-mono text-xl font-semibold tabular-nums text-ink sm:text-2xl">
              {formatAverage(stats.average)}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-inkSoft sm:text-xs">
              média diária de ordens
            </p>
          </div>
          <div>
            <div className="font-mono text-xl font-semibold tabular-nums text-ink sm:text-2xl">
              {stats.totalOrders}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-inkSoft sm:text-xs">
              total geral registrado
            </p>
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="border border-line">
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
