"use client";

import { useState, useTransition } from "react";

type Order = { id: string; date: string; createdAt: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
}: {
  initialDate: string;
  initialOrders: Order[];
}) {
  const [date, setDate] = useState(initialDate);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
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
      }
    });
  }

  const isToday = date === todayISO();

  return (
    <div>
      <div className="mb-10 flex flex-col items-center gap-6 border border-line bg-paper px-8 py-10 text-center">
        <div className="flex items-center gap-3">
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
              className="border-b border-line bg-transparent px-2 py-1 text-center font-mono text-sm text-ink"
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
          <div className="font-mono text-6xl font-semibold tabular-nums text-ink">
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
          className="btn-stamp disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Registrar ordem
        </button>

        {error && <p className="text-sm text-stamp">{error}</p>}
      </div>

      {orders.length > 0 && (
        <div className="border border-line">
          <div className="border-b border-line px-5 py-3 text-xs uppercase tracking-wide text-inkSoft">
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
                  className={`flex items-center justify-between px-5 py-3 text-sm ${
                    i > 0 ? "border-t border-line" : ""
                  }`}
                >
                  <span className="text-inkSoft">
                    Ordem #{orders.length - i}
                  </span>
                  <div className="flex items-center gap-4">
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
