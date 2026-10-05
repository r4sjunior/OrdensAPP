"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/rose/admin/login", { method: "POST", body: JSON.stringify({ password }) });
    if (!res.ok) return setError("Senha errada.");
    location.reload();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Painel da Rose</h1>
      <p className="mt-1 text-sm text-inkSoft">Cadastrar respostas e ver o que o pessoal procurou e não achou.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha do painel" className="field" autoFocus />
        <button type="submit" className="btn-stamp w-full">
          Entrar
        </button>
        {error && <p className="text-sm text-stamp">{error}</p>}
      </form>
    </main>
  );
}
