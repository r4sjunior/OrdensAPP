"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Entry, Miss } from "@/lib/rose/types";
import EntryEditor, { type Draft } from "./EntryEditor";

const blankDraft = (keyword = ""): Draft => ({
  title: "",
  category: "Procedimentos",
  keywords: keyword,
  content: "",
  media: [],
  sensitive: false,
});

export default function AdminPanel({ entries, misses, categories }: { entries: Entry[]; misses: Miss[]; categories: string[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"lacunas" | "respostas">(misses.length ? "lacunas" : "respostas");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState("");

  const sorted = useMemo(
    () =>
      [...entries]
        .filter((e) => !filter || `${e.title} ${e.category} ${e.keywords.join(" ")}`.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)),
    [entries, filter],
  );
  const totalHits = entries.reduce((s, e) => s + e.hits, 0);

  async function dismiss(q: string) {
    await fetch(`/api/rose/admin/misses?q=${encodeURIComponent(q)}`, { method: "DELETE" });
    router.refresh();
  }

  async function remove(e: Entry) {
    if (!confirm(`Apagar “${e.title}”?`)) return;
    await fetch(`/api/rose/admin/entries?slug=${encodeURIComponent(e.slug)}`, { method: "DELETE" });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/rose/admin/login", { method: "DELETE" });
    location.reload();
  }

  if (draft) {
    return (
      <EntryEditor
        draft={draft}
        categories={categories}
        onCancel={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Painel</h1>
          <p className="text-sm text-inkSoft">
            {entries.length} respostas · {totalHits} consultas · {misses.length} lacunas
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-stamp px-4 py-2 text-sm" onClick={() => setDraft(blankDraft())}>
            + Nova
          </button>
          <button type="button" className="btn-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-6 border-b border-line text-sm">
        {(["lacunas", "respostas"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-2 ${tab === t ? "border-stamp font-medium text-ink" : "border-transparent text-inkSoft hover:text-ink"}`}
          >
            {t === "lacunas" ? `Lacunas (${misses.length})` : `Respostas (${entries.length})`}
          </button>
        ))}
      </div>

      {tab === "lacunas" && (
        <section className="mt-4">
          <p className="text-sm text-inkSoft">O que o pessoal procurou e a Rose não soube responder. Quanto mais vezes, mais urgente.</p>
          {misses.length === 0 ? (
            <p className="mt-6 text-sm">Nenhuma lacuna. 🎉</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-sm border border-line bg-white/50">
              {misses.map((m) => (
                <li key={m.query} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold text-stamp">{m.count}×</span>
                  <span className="min-w-0 flex-1 truncate">{m.query}</span>
                  <button type="button" className="btn-ghost shrink-0" onClick={() => setDraft({ ...blankDraft(m.query), title: m.query })}>
                    Responder
                  </button>
                  <button type="button" className="shrink-0 text-xs text-inkSoft hover:text-stamp" onClick={() => dismiss(m.query)} title="Ignorar">
                    ignorar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "respostas" && (
        <section className="mt-4">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar…" className="field" />
          <ul className="mt-4 divide-y divide-line rounded-sm border border-line bg-white/50">
            {sorted.map((e) => (
              <li key={e.slug} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {e.sensitive && "🔒 "}
                    {e.title}
                  </div>
                  <div className="truncate text-xs text-inkSoft">
                    {e.category} · {e.hits} consultas · {e.keywords.slice(0, 4).join(", ")}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  onClick={() =>
                    setDraft({
                      originalSlug: e.slug,
                      title: e.title,
                      category: e.category,
                      keywords: e.keywords.join(", "),
                      content: e.content,
                      media: e.media,
                      sensitive: e.sensitive,
                    })
                  }
                >
                  Editar
                </button>
                <button type="button" className="shrink-0 text-xs text-inkSoft hover:text-stamp" onClick={() => remove(e)}>
                  apagar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
