"use client";

import { useEffect, useMemo, useState } from "react";

type Period = "daily" | "weekly" | "monthly";
type Summary = {
  period: Period;
  referenceDate: string;
  rangeStart: string;
  rangeEnd: string;
  total: number;
  breakdown: { date: string; count: number }[];
};

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, period: Period, dir: 1 | -1) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (period === "daily") d.setUTCDate(d.getUTCDate() + dir);
  if (period === "weekly") d.setUTCDate(d.getUTCDate() + dir * 7);
  if (period === "monthly") d.setUTCMonth(d.getUTCMonth() + dir);
  return d.toISOString().slice(0, 10);
}

function shortLabel(iso: string, period: Period) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (period === "monthly") return String(d.getUTCDate());
  return d.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
}

// Cor da barra conforme a quantidade de ordens do dia:
// 0 a 3 = vermelho, 4 = amarelo, acima de 4 = verde.
function countColor(count: number) {
  if (count <= 3) return "bg-red-500";
  if (count === 4) return "bg-yellow-500";
  return "bg-green-600";
}

function rangeLabel(s: Summary) {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
    });
  if (s.period === "daily") {
    return new Date(`${s.referenceDate}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (s.period === "monthly") {
    return new Date(`${s.referenceDate}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return `${fmt(s.rangeStart)} – ${fmt(s.rangeEnd)}`;
}

export default function ExtratoView() {
  const [period, setPeriod] = useState<Period>("daily");
  const [date, setDate] = useState(todayISO());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/orders/summary?period=${period}&date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, date]);

  // Desabilita o botão de "próximo período" quando já estamos no período atual.
  const isCurrent = useMemo(() => {
    const today = todayISO();
    if (period === "monthly") return date.slice(0, 7) >= today.slice(0, 7);
    return date >= today;
  }, [date, period]);

  const maxCount = summary
    ? Math.max(1, ...summary.breakdown.map((b) => b.count))
    : 1;

  return (
    <div>
      <div className="mb-8 flex gap-2">
        {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? "border-2 border-stamp text-stamp"
                : "border border-line text-inkSoft hover:text-ink"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="border border-line bg-paper p-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setDate((d) => shiftDate(d, period, -1))}
            className="btn-ghost px-3 py-1"
            aria-label="Período anterior"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-sm capitalize text-inkSoft">
              {summary ? rangeLabel(summary) : "\u00A0"}
            </p>
          </div>
          <button
            onClick={() => setDate((d) => shiftDate(d, period, 1))}
            disabled={isCurrent}
            className="btn-ghost px-3 py-1 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Próximo período"
          >
            ›
          </button>
        </div>

        <div className="mb-8 text-center">
          <div className="font-mono text-6xl font-semibold tabular-nums text-ink">
            {loading ? "–" : summary?.total ?? 0}
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-inkSoft">
            {period === "daily" ? "ordens no dia" : "ordens no período"}
          </p>
        </div>

        {summary && summary.breakdown.length > 0 && (
          <div className="flex h-40 items-end gap-1.5 border-t border-line pt-4">
            {summary.breakdown.map((b) => (
              <div key={b.date} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end">
                  <div
                    className={`w-full transition-all ${countColor(b.count)} ${
                      b.date === date && period !== "monthly"
                        ? "opacity-100"
                        : "opacity-70"
                    }`}
                    style={{
                      height: `${Math.max(4, (b.count / maxCount) * 100)}%`,
                    }}
                    title={`${b.count} ordem(ns)`}
                  />
                </div>
                <span className="font-mono text-[10px] text-inkSoft">
                  {shortLabel(b.date, period)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
