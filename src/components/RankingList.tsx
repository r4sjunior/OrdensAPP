"use client";

import { useEffect, useState } from "react";

type Entry = { position: number; orders: number; isMe: boolean };

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
