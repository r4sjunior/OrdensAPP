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

function formatAvg(n: number) {
  return n.toFixed(1).replace(".", ",");
}

// No mensal (até 31 barras) mostramos o número do dia só a cada 5 dias
// (mais o dia 1 e o último), para não poluir o eixo em telas pequenas.
function shouldShowLabel(iso: string, period: Period, isLast: boolean) {
  if (period !== "monthly") return true;
  const day = Number(iso.slice(8, 10));
  return day === 1 || day % 5 === 0 || isLast;
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
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

  const periodAvg =
    summary && summary.breakdown.length > 0
      ? summary.breakdown.reduce((sum, b) => sum + b.count, 0) /
        summary.breakdown.length
      : 0;

  const isMonthly = period === "monthly";
  const today = todayISO();

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 sm:mb-8">
        {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
              period === p
                ? "border-2 border-stamp text-stamp"
                : "border border-line text-inkSoft hover:text-ink"
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="border border-line bg-paper p-4 sm:p-8">
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
              {summary ? rangeLabel(summary) : " "}
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
          <div className="font-mono text-5xl font-semibold tabular-nums text-ink sm:text-6xl">
            {loading ? "–" : summary?.total ?? 0}
          </div>
          <p className="mt-1 text-xs uppercase tracking-wide text-inkSoft">
            {period === "daily" ? "ordens no dia" : "ordens no período"}
          </p>
        </div>

        {summary && summary.breakdown.length > 0 && (
          <div className="border-t border-line pt-4">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-inkSoft sm:text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-red-500" /> 0–3
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-yellow-500" /> 4
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-green-600" /> 5+
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="inline-block h-px w-4 border-t border-dashed border-teal" />
                média do período: {formatAvg(periodAvg)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div
                style={
                  isMonthly
                    ? { minWidth: summary.breakdown.length * 20 }
                    : undefined
                }
              >
                <div className="relative flex h-28 items-end gap-1 sm:gap-1.5">
                  {periodAvg > 0 && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-10 border-t border-dashed border-teal/70"
                      style={{ bottom: `${(periodAvg / maxCount) * 100}%` }}
                    />
                  )}
                  {summary.breakdown.map((b) => {
                    const isSelected =
                      b.date === date && period !== "monthly";
                    const isTodayBar = b.date === today;
                    return (
                      <div
                        key={b.date}
                        className={`flex h-full items-end ${
                          isMonthly ? "w-5 flex-none" : "flex-1"
                        }`}
                      >
                        <div
                          className={`w-full transition-all ${countColor(
                            b.count
                          )} ${
                            isSelected
                              ? "opacity-100"
                              : isTodayBar
                              ? "opacity-90 ring-1 ring-inset ring-ink/40"
                              : "opacity-70"
                          }`}
                          style={{
                            height: `${Math.max(
                              4,
                              (b.count / maxCount) * 100
                            )}%`,
                          }}
                          title={`${formatDateBR(b.date)}: ${b.count} ordem(ns)`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 flex gap-1 sm:gap-1.5">
                  {summary.breakdown.map((b, i) => (
                    <div
                      key={b.date}
                      className={`text-center ${
                        isMonthly ? "w-5 flex-none" : "flex-1"
                      }`}
                    >
                      <span className="font-mono text-[10px] text-inkSoft">
                        {shouldShowLabel(
                          b.date,
                          period,
                          i === summary.breakdown.length - 1
                        )
                          ? shortLabel(b.date, period)
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
