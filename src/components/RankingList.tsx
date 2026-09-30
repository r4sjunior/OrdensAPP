"use client";

import { useEffect, useState } from "react";

type Entry = { position: number; orders: number; isMe: boolean };

const TROPHY_COLOR: Record<number, string> = {
  1: "#D4A017", // ouro
  2: "#9CA3AF", // prata
  3: "#B0703C", // bronze
};

// Altura do degrau do pódio por posição.
const STEP_HEIGHT: Record<number, string> = {
  1: "h-24",
  2: "h-16",
  3: "h-12",
};

function Trophy({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" fill={color} fillOpacity="0.25" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

// Pódio clássico: 2º à esquerda, 1º no centro (mais alto), 3º à direita.
function Podium({ entries }: { entries: Entry[] }) {
  const byPosition = (p: number) => entries.find((e) => e.position === p);
  return (
    <div className="flex items-end justify-center gap-2 sm:gap-3">
      {[2, 1, 3].map((p) => {
        const e = byPosition(p);
        return (
          <div key={p} className="flex w-24 flex-col items-center sm:w-28">
            <div className={e ? "" : "opacity-25"}>
              <Trophy color={TROPHY_COLOR[p]} size={p === 1 ? 48 : 38} />
            </div>
            <span
              className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
                e ? "text-ink" : "text-inkSoft"
              }`}
            >
              {e ? e.orders : "–"}
            </span>
            <span className="mb-1 h-4 text-xs font-medium text-stamp">
              {e?.isMe ? "Você" : ""}
            </span>
            <div
              className={`flex w-full items-start justify-center border border-line pt-2 font-display text-2xl font-bold text-paper ${STEP_HEIGHT[p]}`}
              style={{ backgroundColor: TROPHY_COLOR[p] }}
            >
              {p}º
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Ranking anônimo: só posição e número de ordens; o usuário logado aparece como "Você".
export default function RankingList({
  type,
  date,
  title,
  subtitle,
}: {
  type: "weekly" | "general";
  date?: string;
  title: string;
  subtitle: string;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    const qs = type === "weekly" ? `type=weekly&date=${date}` : "type=general";
    fetch(`/api/orders/ranking?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [type, date]);

  return (
    <div className="mt-6 border border-line bg-paper p-4 sm:p-8">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mb-4 text-xs text-inkSoft">{subtitle}</p>

      {entries === null ? (
        <p className="text-sm text-inkSoft">Carregando…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-inkSoft">Nenhuma ordem registrada no período.</p>
      ) : type === "weekly" ? (
        <Podium entries={entries} />
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {entries.map((e) => (
            <li
              key={e.position}
              className={`flex items-center justify-between px-2 py-3 ${
                e.isMe ? "bg-stamp/10" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 font-display text-lg font-bold text-stamp">
                  {e.position}º
                </span>
                {e.isMe && <span className="text-xs font-medium text-ink">Você</span>}
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums text-ink">
                {e.orders}{" "}
                <span className="font-body text-xs font-normal text-inkSoft">ordens</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
