"use client";

import { useState } from "react";
import type { Media } from "@/lib/types";
import { MediaView } from "./EntryCard";

export type Draft = {
  originalSlug?: string;
  title: string;
  category: string;
  keywords: string; // separadas por vírgula ou linha
  content: string;
  media: Media[];
  sensitive: boolean;
};

export default function EntryEditor({
  draft: initial,
  categories,
  onCancel,
  onSaved,
}: {
  draft: Draft;
  categories: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      if (res.ok) {
        const m = (await res.json()) as Media;
        setD((x) => ({ ...x, media: [...x.media, m] }));
      } else setError(`Não deu para enviar ${file.name}.`);
    }
    setBusy(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/entries", {
      method: "POST",
      body: JSON.stringify({ ...d, keywords: d.keywords.split(/[,\n]/) }),
    });
    setBusy(false);
    if (!res.ok) return setError(((await res.json()) as { error: string }).error);
    onSaved();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <button type="button" onClick={onCancel} className="text-sm text-inkSoft hover:text-ink">
        ← Voltar
      </button>
      <h1 className="mt-3 font-display text-2xl font-bold">{d.originalSlug ? "Editar resposta" : "Nova resposta"}</h1>

      <form onSubmit={save} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Título</span>
          <input value={d.title} onChange={(e) => set("title", e.target.value)} className="field mt-1" placeholder="Ex: Código dos equipamentos HFC" required />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Categoria</span>
          <input value={d.category} onChange={(e) => set("category", e.target.value)} list="cats" className="field mt-1" />
          <datalist id="cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Como o pessoal pergunta</span>
          <span className="block text-xs text-inkSoft">
            Separe por vírgula. Não precisa se preocupar com acento, plural ou maiúscula — a Rose já entende.
          </span>
          <textarea value={d.keywords} onChange={(e) => set("keywords", e.target.value)} rows={2} className="field mt-1" placeholder="codigo hfc, equipamentos hfc, material hfc" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Resposta</span>
          <textarea value={d.content} onChange={(e) => set("content", e.target.value)} rows={10} className="field mt-1 font-mono text-[13px]" />
        </label>

        <div>
          <span className="text-sm font-medium">Fotos, vídeos, PDFs, APK…</span>
          <MediaView media={d.media} />
          {d.media.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {d.media.map((m) => (
                <li key={m.src} className="flex items-center justify-between gap-2">
                  <span className="truncate text-inkSoft">{m.name}</span>
                  <button type="button" className="text-stamp" onClick={() => set("media", d.media.filter((x) => x.src !== m.src))}>
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input type="file" multiple onChange={(e) => upload(e.target.files)} className="mt-2 block w-full text-sm text-inkSoft file:mr-3 file:rounded-sm file:border file:border-line file:bg-white/60 file:px-3 file:py-1.5 file:text-ink" />
        </div>

        <label className="flex items-start gap-3 rounded-sm border border-line bg-white/50 p-3">
          <input type="checkbox" checked={d.sensitive} onChange={(e) => set("sensitive", e.target.checked)} className="mt-1 accent-stamp" />
          <span>
            <span className="text-sm font-medium">🔒 Sigiloso</span>
            <span className="block text-xs text-inkSoft">
              Senhas e acessos. No app só aparece com o código da equipe; no Telegram, a Rose manda no privado em vez de expor no grupo.
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-stamp">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="btn-stamp">
            {busy ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}
