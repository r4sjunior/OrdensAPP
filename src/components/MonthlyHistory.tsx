"use client";

import { useEffect, useState } from "react";
import { MONTH_LABELS_PT, todayISO } from "@/lib/dates";

type MonthEntry = {
  month: string; // YYYY-MM
  total: number;
  workedDays: number;
  average: number;
};

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${MONTH_LABELS_PT[Number(m) - 1]} ${y}`;
}

function formatAvg(n: number) {
  return n.toFixed(1).replace(".", ",");
}

// Lista o fechamento de cada mês anterior ao atual (total, dias trabalhados e média).
// Clicar num mês abre o extrato mensal dele.
export default function MonthlyHistory({
  selectedMonth,
  onSelect,
}: {
  selectedMonth: string;
  onSelect: (month: string) => void;
}) {
  const [months, setMonths] = useState<MonthEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/orders/monthly")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMonths(data.months ?? []);
      })
      .catch(() => {
        if (!cancelled) setMonths([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentMonth = todayISO().slice(0, 7);
  const previous = months?.filter((m) => m.month < currentMonth) ?? null;

  return (
    <div className="mt-6 card p-4 sm:p-8">
      <h2 className="font-display text-lg font-bold text-ink">Meses anteriores</h2>
      <p className="mb-4 text-xs text-inkSoft">Fechamento de ordens de cada mês</p>

      {previous === null ? (
        <p className="text-sm text-inkSoft">Carregando…</p>
      ) : previous.length === 0 ? (
        <p className="text-sm text-inkSoft">Nenhum mês anterior com ordens registradas.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {previous.map((m) => (
            <li key={m.month}>
              <button
                type="button"
                onClick={() => onSelect(m.month)}
                className={`flex w-full items-center justify-between px-2 py-3 text-left transition-colors hover:bg-stamp/5 ${
                  m.month === selectedMonth ? "bg-stamp/10" : ""
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-ink">
                    {monthLabel(m.month)}
                  </span>
                  <p className="text-[10px] text-inkSoft sm:text-xs">
                    {m.workedDays} {m.workedDays === 1 ? "dia trabalhado" : "dias trabalhados"}
                    {" · "}média {formatAvg(m.average)}/dia
                  </p>
                </div>
                <span className="font-mono text-lg font-semibold tabular-nums text-ink">
                  {m.total}{" "}
                  <span className="font-body text-xs font-normal text-inkSoft">
                    {m.total === 1 ? "ordem" : "ordens"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
