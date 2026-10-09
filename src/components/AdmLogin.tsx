"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdmLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/adm/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível entrar.");
      return;
    }
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm border border-line bg-paper p-6 sm:p-8">
        <p className="text-3xl" aria-hidden>
          🍺
        </p>
        <h1 className="mt-2 font-display text-lg font-bold text-ink">ADM · Sorteio</h1>
        <p className="mb-6 text-xs text-inkSoft">Caixinha de Gela</p>

        {!configured && (
          <p className="mb-4 text-xs text-stamp">
            Falta definir ADM_USER e ADM_PASSWORD nas variáveis de ambiente.
          </p>
        )}

        <label className="mb-1 block text-xs text-inkSoft" htmlFor="adm-user">
          Usuário
        </label>
        <input
          id="adm-user"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          className="field mb-4"
        />
        <label className="mb-1 block text-xs text-inkSoft" htmlFor="adm-password">
          Senha
        </label>
        <input
          id="adm-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="field mb-6"
        />
        <button type="submit" disabled={busy} className="btn-stamp w-full">
          {busy ? "Entrando…" : "Entrar"}
        </button>
        {error && <p className="mt-4 text-sm text-stamp">{error}</p>}
      </form>
    </main>
  );
}
