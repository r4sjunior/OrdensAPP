"use client";

import { useEffect, useState } from "react";
import CampaignTrailer from "./CampaignTrailer";

// Chamada da campanha (animação 8-bit). Abre sozinha só na primeira vez (fica marcado
// no navegador); depois só abre quando o usuário toca no card do sorteio.
const SEEN_KEY = "caixinha-de-gela:chamada-vista";

function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // navegador sem storage: na pior das hipóteses a chamada abre de novo
  }
}

export default function CampaignIntro({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Cada "play" remonta a animação do começo. O som só pode começar depois de um
  // toque, então quando abre sozinha ela roda muda e o botão recomeça com som.
  const [play, setPlay] = useState({ id: 0, sound: false });

  useEffect(() => {
    if (!alreadySeen()) onOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) markSeen();
  }, [open]);

  if (!open) return null;

  const close = () => {
    setPlay((p) => ({ id: p.id + 1, sound: false }));
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chamada da campanha Caixinha de Gela"
      onClick={close}
    >
      <div className="w-full max-w-[min(24rem,calc((100vh-7rem)*0.6))]" onClick={(e) => e.stopPropagation()}>
        <div className="border-4 border-black shadow-[6px_6px_0_#000]">
          <CampaignTrailer key={play.id} withSound={play.sound} />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setPlay((p) => ({ id: p.id + 1, sound: true }))}
            className="btn-stamp flex-1 bg-paper px-3"
          >
            {play.sound ? "↻ De novo" : "🔊 Ver com som"}
          </button>
          <button type="button" onClick={close} className="btn-ghost flex-1 bg-paper">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
