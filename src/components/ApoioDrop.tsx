"use client";

import { useCallback, useEffect, useState } from "react";
import type { HelpView } from "@/lib/apoio";
import { HELP_ON_THE_WAY_SONG, playSong, sharedAudio, siren, unlockAudio } from "@/lib/chiptune";
import { ensurePushSubscription, isIosBrowser, pushStatus, type PushStatus } from "@/lib/pushClient";
import { APOIO_END, APOIO_START, apoioWindow } from "@/lib/apoioHours";

// APOIO DROP: botão vermelho fixo para pedir ajuda com a localização do GPS, alerta
// em tela cheia para todos (sirene só nos primeiros 30s, depois só visual) e aviso
// "ajuda a caminho" quando alguém aceita.

const POLL_MS = 10_000;
const SIREN_MS = 30_000;
const JINGLE_WITHIN_MS = 60_000; // só toca "ajuda a caminho" se aceitou há pouco
const SEEN_KEY = "apoio-drop:avisos-vistos";
const PROMPT_LATER_KEY = "apoio-drop:ativar-depois";
export const APOIO_REFRESH_EVENT = "apoio:refresh";

// Guardado fora do componente: o NavBar remonta a cada página e a sirene não pode
// recomeçar por causa disso.
const sirens = new Map<string, () => void>();
const sirened = new Set<string>();
const jingled = new Set<string>();

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // sem storage: o aviso some ao fechar mesmo assim
  }
}

function stopSiren(id: string) {
  sirens.get(id)?.();
  sirens.delete(id);
}

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${s % 60} s` : `${s} s`;
}

const mapsUrl = (r: HelpView) => `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`;
const wazeUrl = (r: HelpView) => `https://waze.com/ul?ll=${r.lat},${r.lng}&navigate=yes`;

function MapButtons({ r }: { r: HelpView }) {
  return (
    <div className="flex gap-2">
      <a href={mapsUrl(r)} target="_blank" rel="noreferrer" className="flex-1 rounded-sm border-2 border-white bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white">
        📍 Maps
      </a>
      <a href={wazeUrl(r)} target="_blank" rel="noreferrer" className="flex-1 rounded-sm border-2 border-white bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white">
        🚗 Waze
      </a>
    </div>
  );
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Este aparelho não informa a localização."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 30_000,
    });
  });
}

export default function ApoioDrop() {
  const [requests, setRequests] = useState<HelpView[]>([]);
  const [offset, setOffset] = useState(0); // relógio do servidor - relógio do aparelho
  const [now, setNow] = useState(() => Date.now());
  const [minimized, setMinimized] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<string[]>([]);
  const [modal, setModal] = useState<"closed" | "confirm" | "locating" | "sending">("closed");
  const [error, setError] = useState<string | null>(null);
  const [push, setPush] = useState<PushStatus>("granted");
  const [promptLater, setPromptLater] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const sent = Date.now();
      const res = await fetch("/api/apoio", { cache: "no-store" });
      if (!res.ok) return;
      const data: { requests: HelpView[]; serverNow: number } = await res.json();
      setOffset(data.serverNow - (sent + Date.now()) / 2);
      setRequests(data.requests);
    } catch {
      // sem rede: tenta de novo no próximo ciclo
    }
  }, []);

  // Busca periódica + quando o app volta para a tela, chega um push ou a própria tela pede.
  useEffect(() => {
    refresh();
    setSeen(readSeen());
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    const onSwMessage = (e: MessageEvent) => e.data?.type === "apoio" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(APOIO_REFRESH_EVENT, refresh);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    // Qualquer toque na tela libera o som (o navegador exige um toque antes).
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(APOIO_REFRESH_EVENT, refresh);
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [refresh]);

  // Notificações push: mantém a inscrição deste aparelho em dia.
  useEffect(() => {
    const status = pushStatus();
    setPush(status);
    if (status === "granted") ensurePushSubscription(false).catch(() => {});
    try {
      const later = Number(localStorage.getItem(PROMPT_LATER_KEY) ?? 0);
      setPromptLater(Date.now() - later < 3 * 24 * 60 * 60 * 1000);
    } catch {
      setPromptLater(false);
    }
  }, []);

  const serverNow = now + offset;
  const open = requests.filter((r) => !r.acceptedAt && !r.cancelledAt);
  const othersOpen = open.filter((r) => !r.isMine);
  const mine = open.find((r) => r.isMine);
  const accepted = requests.filter((r) => r.acceptedAt && !seen.includes(r.id));
  const hasLive = open.length > 0 || accepted.length > 0;

  // Relógio dos contadores: a cada 1s com alerta na tela; senão a cada 30s (horário do botão).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), hasLive ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [hasLive]);

  const inHours = apoioWindow(serverNow).open;

  // Sons: sirene nos primeiros 30s de cada pedido; jingle quando alguém aceita.
  useEffect(() => {
    const audio = sharedAudio();
    const current = Date.now() + offset;
    for (const r of othersOpen) {
      const elapsed = current - r.createdAt;
      if (elapsed < SIREN_MS && !sirened.has(r.id) && !minimized.has(r.id)) {
        sirened.add(r.id);
        navigator.vibrate?.([600, 200, 600, 200, 600]);
        if (audio) sirens.set(r.id, siren(audio, (SIREN_MS - elapsed) / 1000));
      }
    }
    sirens.forEach((_, id) => {
      if (!othersOpen.some((r) => r.id === id)) stopSiren(id);
    });
    for (const r of requests) {
      if (r.acceptedAt && !jingled.has(r.id) && current - r.acceptedAt < JINGLE_WITHIN_MS) {
        jingled.add(r.id);
        navigator.vibrate?.([200, 100, 200]);
        if (audio) playSong(HELP_ON_THE_WAY_SONG, audio);
      }
    }
  }, [requests, othersOpen, minimized, offset]);

  function minimize(id: string) {
    stopSiren(id);
    setMinimized((m) => new Set(m).add(id));
  }

  function restore(id: string) {
    setMinimized((m) => {
      const next = new Set(m);
      next.delete(id);
      return next;
    });
  }

  function dismissAccepted(id: string) {
    const next = [...seen, id];
    setSeen(next);
    writeSeen(next);
  }

  async function accept(r: HelpView) {
    if (!window.confirm(`Vai apoiar ${r.name}? Todo mundo vai ser avisado que a ajuda está a caminho.`)) return;
    stopSiren(r.id);
    const res = await fetch(`/api/apoio/${r.id}/accept`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      window.alert(body?.error ?? "Não foi possível aceitar o pedido.");
    }
    refresh();
  }

  async function cancelMine(r: HelpView) {
    if (!window.confirm("Cancelar seu pedido de apoio?")) return;
    await fetch(`/api/apoio/${r.id}/cancel`, { method: "POST" });
    refresh();
  }

  async function requestHelp() {
    setError(null);
    setModal("locating");
    let position: GeolocationPosition;
    try {
      position = await getPosition();
    } catch (e) {
      const geo = e as GeolocationPositionError;
      setError(
        geo?.code === 1
          ? "Permita a localização para o app (no navegador: cadeado ao lado do endereço → Localização → Permitir) e tente de novo."
          : "Não foi possível pegar sua localização. Verifique se o GPS está ligado e tente de novo."
      );
      setModal("confirm");
      return;
    }
    setModal("sending");
    const res = await fetch("/api/apoio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível enviar o pedido.");
      setModal("confirm");
      return;
    }
    setModal("closed");
    refresh();
  }

  async function enablePush() {
    try {
      setPush(await ensurePushSubscription(true));
    } catch {
      setPush(pushStatus());
    }
  }

  function promptLaterClick() {
    try {
      localStorage.setItem(PROMPT_LATER_KEY, String(Date.now()));
    } catch {
      // ignora
    }
    setPromptLater(true);
  }

  const fullScreen = othersOpen.find((r) => !minimized.has(r.id));
  const showPushPrompt = !promptLater && (push === "prompt" || (push === "unsupported" && isIosBrowser()));

  return (
    <>
      {/* Faixas no topo: pedidos minimizados, o meu pedido, "ajuda a caminho", ativar alertas */}
      <div className="fixed inset-x-0 top-0 z-[75] flex flex-col">
        {othersOpen
          .filter((r) => minimized.has(r.id))
          .map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => restore(r.id)}
              className="animate-pulse bg-red-600 px-4 py-2 text-left text-sm font-semibold text-white"
            >
              🆘 {r.name} pede APOIO DROP · {clock(serverNow - r.createdAt)} · toque para ver
            </button>
          ))}

        {mine && (
          <div className="flex items-center justify-between gap-3 bg-red-700 px-4 py-2 text-sm text-white">
            <span>
              🆘 Seu pedido de apoio está aberto há <strong className="font-mono">{clock(serverNow - mine.createdAt)}</strong>
            </span>
            <button type="button" onClick={() => cancelMine(mine)} className="shrink-0 rounded-sm border border-white px-2 py-1 text-xs">
              Cancelar
            </button>
          </div>
        )}

        {accepted.map((r) => (
          <div key={r.id} className="bg-green-700 px-4 py-3 text-sm text-white">
            <div className="flex items-start justify-between gap-3">
              <p>
                <strong>✅ AJUDA A CAMINHO!</strong>{" "}
                {r.isMine
                  ? `${r.acceptedByName} está indo até você.`
                  : r.iAccepted
                    ? `Você vai apoiar ${r.name}.`
                    : `${r.acceptedByName} vai apoiar ${r.name}.`}{" "}
                Ficou {duration((r.acceptedAt ?? 0) - r.createdAt)} em aberto.
              </p>
              <button type="button" onClick={() => dismissAccepted(r.id)} className="shrink-0 rounded-sm border border-white px-2 py-1 text-xs">
                OK
              </button>
            </div>
            {r.iAccepted && (
              <div className="mt-2">
                <MapButtons r={r} />
              </div>
            )}
          </div>
        ))}

        {showPushPrompt && (
          <div className="flex items-center justify-between gap-3 border-b border-line bg-paperDim px-4 py-2 text-xs text-ink">
            {push === "unsupported" ? (
              <span>🔔 No iPhone, para receber os alertas do APOIO DROP com o app fechado: Compartilhar → Adicionar à Tela de Início.</span>
            ) : (
              <>
                <span>🔔 Ative os alertas do APOIO DROP para receber pedidos de ajuda mesmo com o app fechado.</span>
                <button type="button" onClick={enablePush} className="shrink-0 rounded-sm bg-red-600 px-3 py-1 font-semibold text-white">
                  Ativar
                </button>
              </>
            )}
            <button type="button" onClick={promptLaterClick} className="shrink-0 text-inkSoft underline">
              Depois
            </button>
          </div>
        )}
      </div>

      {/* Alerta em tela cheia */}
      {fullScreen && (
        <div className="fixed inset-0 z-[78] flex flex-col items-center justify-center bg-red-700 px-6 text-center text-white" role="alertdialog" aria-label="Pedido de APOIO DROP">
          <div className="pointer-events-none absolute inset-0 animate-pulse bg-red-500/60" aria-hidden />
          <div className="relative flex w-full max-w-sm flex-col items-center">
            <p className="font-display text-3xl font-bold tracking-wide">🆘 APOIO DROP</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fullScreen.imageUrl} alt="" className="mt-6 h-28 w-28 rounded-full border-4 border-white object-cover" />
            <p className="mt-4 animate-pulse font-display text-2xl font-bold">{fullScreen.name}</p>
            <p className="mt-1 text-sm">precisa de apoio</p>
            <p className="mt-4 font-mono text-4xl font-semibold tabular-nums">{clock(serverNow - fullScreen.createdAt)}</p>
            <p className="text-xs opacity-90">aguardando ajuda</p>
            {fullScreen.accuracy !== null && (
              <p className="mt-2 text-xs opacity-90">localização com precisão de ±{Math.round(fullScreen.accuracy)} m</p>
            )}

            <div className="mt-6 w-full space-y-3">
              <MapButtons r={fullScreen} />
              <button
                type="button"
                onClick={() => accept(fullScreen)}
                className="w-full rounded-sm border-4 border-white bg-white px-4 py-4 font-display text-xl font-bold uppercase text-red-700 shadow-lg active:scale-[0.98]"
              >
                🙋 Vou ajudar
              </button>
              <button type="button" onClick={() => minimize(fullScreen.id)} className="w-full py-2 text-sm underline">
                Minimizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão fixo (cinza e sem ação fora do horário) */}
      {!mine && !inHours && (
        <button
          type="button"
          onClick={() => window.alert(`O APOIO DROP funciona todos os dias das ${APOIO_START} às ${APOIO_END}.`)}
          className="fixed bottom-4 right-4 z-[65] rounded-full border-2 border-line bg-paperDim px-4 py-2 text-left font-display text-xs font-bold uppercase leading-tight tracking-wide text-inkSoft shadow"
        >
          🆘 Apoio Drop
          <span className="block font-body text-[10px] font-normal normal-case tracking-normal">
            {APOIO_START} às {APOIO_END}
          </span>
        </button>
      )}
      {!mine && inHours && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModal("confirm");
          }}
          className="fixed bottom-4 right-4 z-[65] rounded-full border-2 border-red-800 bg-red-600 px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-white shadow-lg active:scale-95"
        >
          🆘 Apoio Drop
        </button>
      )}

      {/* Confirmação do pedido */}
      {modal !== "closed" && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/70 p-4 sm:items-center" onClick={() => modal === "confirm" && setModal("closed")}>
          <div className="w-full max-w-sm border-2 border-red-600 bg-paper p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-2xl font-bold text-red-600">🆘 APOIO DROP</p>
            <p className="mt-3 text-sm text-ink">
              Todos os técnicos vão receber um alerta com a sua <strong>localização exata</strong>.
            </p>
            {error && <p className="mt-3 text-sm text-stamp">{error}</p>}
            <button
              type="button"
              onClick={requestHelp}
              disabled={modal !== "confirm"}
              className="mt-5 w-full rounded-sm border-2 border-red-800 bg-red-600 px-4 py-4 font-display text-lg font-bold uppercase text-white disabled:opacity-60"
            >
              {modal === "locating" ? "Pegando localização…" : modal === "sending" ? "Enviando…" : "Pedir apoio"}
            </button>
            <button type="button" onClick={() => setModal("closed")} disabled={modal !== "confirm"} className="mt-3 w-full py-2 text-sm text-inkSoft underline">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
