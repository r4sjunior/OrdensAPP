"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entry } from "@/lib/rose/types";
import EntryCard from "./EntryCard";

type Hit = { entry: Entry; score: number; confidence: "alta" | "media" | "baixa" };

const SUGGESTIONS = ["senha master", "achar cto", "amino sem áudio", "ip os mobile", "check list", "NA40"];

export default function SearchApp({ categories }: { categories: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [answered, setAnswered] = useState(true);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async (query: string) => {
    const res = await fetch(`/api/rose/search?q=${encodeURIComponent(query)}`);
    const data = (await res.json()) as { hits: Hit[]; answered: boolean };
    setHits(data.hits);
    setAnswered(data.answered);
    setLoading(false);
  }, []);

  // link compartilhável: /?q=senha%20zte já abre com a busca feita
  useEffect(() => {
    const initial = new URLSearchParams(location.search).get("q");
    if (initial) setQ(initial);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q), 120);
    return () => clearTimeout(t);
  }, [q, run]);

  const searching = q.trim().length > 0;
  const shown = hits.filter((h) => !cat || h.entry.category === cat);
  const best = searching && shown[0]?.confidence === "alta" ? shown[0] : null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <div className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 pb-3 pt-4 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
            (document.activeElement as HTMLElement | null)?.blur();
          }}
        >
          <label htmlFor="q" className="sr-only">
            Buscar
          </label>
          <input
            id="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pergunte à Rose… ex: senha zte, achar cto, NA40"
            className="field py-3 text-base"
            autoComplete="off"
            enterKeyHint="search"
          />
        </form>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button type="button" onClick={() => setCat(null)} className={`chip ${cat === null ? "chip-on" : ""}`}>
            Tudo
          </button>
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCat(cat === c ? null : c)} className={`chip ${cat === c ? "chip-on" : ""}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {!searching && !cat && (
        <div className="mb-4 mt-2 flex flex-wrap items-center gap-2 text-sm text-inkSoft">
          <span>Experimente:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setQ(s)} className="underline decoration-line underline-offset-4 hover:text-ink">
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-inkSoft">Carregando…</p>
      ) : (
        <>
          {searching && !answered && (
            <div className="mt-2 rounded-sm border border-dashed border-stamp/60 px-4 py-3 text-sm">
              <p className="font-medium">A Rose ainda não sabe isso.</p>
              {shown.length > 0 && <p className="mt-1 text-inkSoft">Talvez seja algum destes:</p>}
            </div>
          )}

          <div className="mt-3 space-y-2">
            {shown.map((h) => (
              <EntryCard
                key={`${h.entry.slug}-${best?.entry.slug === h.entry.slug}`}
                entry={h.entry}
                open={best?.entry.slug === h.entry.slug}
                highlight={best?.entry.slug === h.entry.slug}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
