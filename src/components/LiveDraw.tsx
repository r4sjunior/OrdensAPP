"use client";

import { useEffect, useState } from "react";
import DrawShow from "./DrawShow";
import { useDrawView } from "./useDrawView";

export const PRESENCE_EVENT = "ordens:presence";
const DISMISSED_KEY = "caixinha-de-gela:sorteio-fechado";

function dismissedId() {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

// Abre a roleta ao vivo sozinha quando o adm aperta VALENDO. Fica escutando o sinal
// de presença (OnlineBadge), que diz se há um sorteio na tela. Se o usuário fechar,
// não abre de novo para o mesmo sorteio.
export default function LiveDraw() {
  const [drawId, setDrawId] = useState<string | null>(null);
  const live = useDrawView(drawId);

  useEffect(() => {
    function onPresence(e: Event) {
      const id = (e as CustomEvent<{ drawId: string | null }>).detail.drawId;
      setDrawId(id && id !== dismissedId() ? id : null);
    }
    window.addEventListener(PRESENCE_EVENT, onPresence);
    return () => window.removeEventListener(PRESENCE_EVENT, onPresence);
  }, []);

  if (!drawId || !live) return null;

  function close() {
    try {
      localStorage.setItem(DISMISSED_KEY, drawId!);
    } catch {
      // sem storage: fecha só até o próximo sinal
    }
    setDrawId(null);
  }

  return <DrawShow view={live.view} clockOffset={live.clockOffset} onClose={close} />;
}
