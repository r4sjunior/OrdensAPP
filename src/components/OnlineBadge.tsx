"use client";

import { useEffect, useState } from "react";
import { PRESENCE_EVENT } from "./LiveDraw";

const HEARTBEAT_MS = 30_000;

// Bolinha verde + número de usuários conectados agora.
// Enquanto a aba está visível, envia um sinal de presença a cada 30s. A resposta
// também diz se há sorteio na tela; repassa para o LiveDraw por um evento.
export default function OnlineBadge() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/presence", { method: "POST" });
        if (!res.ok) return;
        const data: { online: number; drawId: string | null } = await res.json();
        if (cancelled) return;
        setOnline(data.online);
        window.dispatchEvent(new CustomEvent(PRESENCE_EVENT, { detail: { drawId: data.drawId } }));
      } catch {
        // sem rede: mantém o último valor
      }
    }

    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return (
    <span
      className="flex items-center gap-1.5 text-xs text-inkSoft sm:text-sm"
      title="Usuários conectados agora"
      aria-label={`${online ?? 0} usuários conectados`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <span className="font-mono font-semibold tabular-nums text-ink">
        {online ?? "–"}
      </span>
    </span>
  );
}
