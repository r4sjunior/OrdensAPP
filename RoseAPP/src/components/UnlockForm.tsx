"use client";

import { useState } from "react";

export default function UnlockForm({ onDone }: { onDone?: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/acesso", { method: "POST", body: JSON.stringify({ code }) });
    setBusy(false);
    if (!res.ok) return setError("Código errado.");
    if (onDone) onDone();
    else location.reload();
  }

  return (
    <form onSubmit={submit} className="mt-2 flex gap-2">
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Código da equipe"
        className="field"
        autoComplete="off"
      />
      <button type="submit" disabled={busy || !code} className="btn-stamp shrink-0 px-4 py-2 text-sm">
        Abrir
      </button>
      {error && <span className="self-center text-sm text-stamp">{error}</span>}
    </form>
  );
}
