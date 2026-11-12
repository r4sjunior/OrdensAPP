"use client";

import { useEffect, useState } from "react";
import CampaignTrailer from "./CampaignTrailer";
import NatalTrailer from "./NatalTrailer";
import type { Promo } from "@/lib/campaign";

// Vídeo do card do sorteio (animação 8-bit): a chamada da campanha (até 30/11) ou a
// vinheta de Natal (só em 01/12). Cada um abre sozinho só na primeira vez (fica marcado
// no navegador); depois só abre quando o usuário toca no card do sorteio.
const SEEN_KEY: Record<Promo, string> = {
  chamada: "caixinha-de-gela:chamada-vista",
  natal: "caixinha-de-gela:natal-2026-vista",
};
const LABEL: Record<Promo, string> = {
  chamada: "Chamada da campanha Caixinha de Gela",
  natal: "Vinheta de Natal",
};

function alreadySeen(kind: Promo) {
  try {
    return localStorage.getItem(SEEN_KEY[kind]) === "1";
  } catch {
    return false;
  }
}

function markSeen(kind: Promo) {
  try {
    localStorage.setItem(SEEN_KEY[kind], "1");
  } catch {
    // navegador sem storage: na pior das hipóteses o vídeo abre de novo
  }
}

export default function CampaignIntro({
  kind,
  open,
  onOpenChange,
}: {
  kind: Promo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Cada "play" remonta a animação do começo. O som só pode começar depois de um
  // toque, então quando abre sozinha ela roda muda e o botão recomeça com som.
  const [play, setPlay] = useState({ id: 0, sound: false });

  useEffect(() => {
    if (!alreadySeen(kind)) onOpenChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) markSeen(kind);
  }, [open, kind]);

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
      aria-label={LABEL[kind]}
      onClick={close}
    >
      <div className="w-full max-w-[min(24rem,calc((100vh-7rem)*0.6))]" onClick={(e) => e.stopPropagation()}>
        <div className="border-4 border-black shadow-[6px_6px_0_#000]">
          {kind === "natal" ? (
            <NatalTrailer key={play.id} withSound={play.sound} />
          ) : (
            <CampaignTrailer key={play.id} withSound={play.sound} />
          )}
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
