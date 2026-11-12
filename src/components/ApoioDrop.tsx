"use client";

import { useCallback, useEffect, useState } from "react";
import type { HelpView } from "@/lib/apoio";
import { HELP_ON_THE_WAY_SONG, playSong, sharedAudio, siren, unlockAudio } from "@/lib/chiptune";
import { ensurePushSubscription, isIosBrowser, pushStatus, type PushStatus } from "@/lib/pushClient";
import { APOIO_END, APOIO_START, apoioWindow } from "@/lib/apoioHours";

// APOIO DROP: botão vermelho fixo para pedir ajuda com a localização do GPS, alerta
// em tela cheia para todos (sirene só nos primeiros 30s, depois só visual) e aviso
// "ajuda a caminho" quando alguém aceita.

const POLL_MS = 10_000; // sem tempo real (stream fora do ar)
const POLL_LIVE_MS = 60_000; // com tempo real: só uma conferência de segurança
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
const notified = new Set<string>();
const NOTIFY_WITHIN_MS = 10 * 60_000; // aviso local só para pedidos recentes

const placeLine = (r: HelpView) => [r.bairro, r.address].filter(Boolean).join(" · ");

// Rede de segurança do push: com a aba minimizada mas viva, a própria aba mostra a
// notificação do sistema (mesma tag do push, então não duplica).
async function notifyInBackground(r: HelpView) {
  if (document.visibilityState === "visible") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (!reg) return;
  const tag = `apoio-${r.id}`;
  const shown = await reg.getNotifications({ tag }).catch(() => []);
  if (shown.length > 0) return; // o push chegou antes
  const where = placeLine(r);
  const options = {
    body: where ? `${r.name} pediu apoio!\n📍 ${where}` :`${r.name} pediu apoio! Toque para ver a localização.`,
    tag,
    renotify: true,
    requireInteraction: true,
    icon: "/icon-192",
    badge: "/badge-sos",
    image: `/api/apoio/${r.id}/card`,
    vibrate: [800, 250, 800, 250, 800, 250, 800, 250, 1200],
    actions: [
      { action: "maps", title: "📍 Abrir no Maps" },
      { action: "open", title: "🙋 Ver e ajudar" },
    ],
    data: { url: "/dashboard", kind: "apoio-created", requestId: r.id, lat: r.lat, lng: r.lng },
  };
  await reg
    .showNotification(r.bairro ? `🆘 SOS DROP · ${r.bairro.toUpperCase()}` : "🆘 SOS DROP", options as NotificationOptions)
    .catch(() => {});
}

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
  const cls =
    "flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 backdrop-blur transition hover:bg-white/25 active:scale-[0.98]";
  return (
    <div className="flex gap-2">
      <a href={mapsUrl(r)} target="_blank" rel="noreferrer" className={cls}>
        📍 Maps
      </a>
      <a href={wazeUrl(r)} target="_blank" rel="noreferrer" className={cls}>
        🚗 Waze
      </a>
    </div>
  );
}

// Bairro em letras grandes + rua; sem endereço (geocodificação falhou) mostra as coordenadas.
function PlaceCard({ r }: { r: HelpView }) {
  const detail = [r.address, r.city].filter(Boolean).join(" · ");
  return (
    <div className="w-full animate-pop-in rounded-2xl bg-white p-4 text-left text-red-700 shadow-2xl shadow-red-950/40">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500">📍 Bairro</p>
      <p className="break-words font-display text-3xl font-bold uppercase leading-tight sm:text-4xl">
        {r.bairro ?? "Ver no mapa"}
      </p>
      {detail && <p className="mt-1 text-base font-semibold text-red-900">{detail}</p>}
      {!r.address && !r.bairro && (
        <p className="mt-1 font-mono text-sm text-red-900">
          {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
        </p>
      )}
      {r.accuracy !== null && <p className="mt-1 text-xs text-red-500">precisão do GPS ±{Math.round(r.accuracy)} m</p>}
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
  const [live, setLive] = useState(false); // stream de tempo real conectado

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

  // Tempo real: o servidor avisa (SSE) assim que um pedido é criado/aceito/cancelado.
  // Continua conectado com a aba minimizada (enquanto o navegador deixar): assim a
  // sirene e o alerta saem mesmo sem o push. Com a aba congelada quem avisa é o push.
  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    let source: EventSource | null = null;

    const connect = () => {
      if (source) return;
      source = new EventSource("/api/apoio/stream");
      source.addEventListener("ready", () => {
        setLive(true);
        refresh(); // pega o que mudou enquanto estava desconectado
      });
      source.addEventListener("apoio", () => refresh());
      source.onerror = () => {
        setLive(false);
        // CONNECTING = o navegador vai tentar de novo sozinho; CLOSED = servidor recusou
        // (ex: 503), fica na busca periódica até a próxima vez que o app voltar à tela.
        if (source?.readyState === EventSource.CLOSED) source = null;
      };
    };
    const onVisibility = () => document.visibilityState === "visible" && connect();

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      source?.close();
      source = null;
      setLive(false);
    };
  }, [refresh]);

  // Busca periódica (rede de segurança) + quando o app volta para a tela, chega um push
  // ou a própria tela pede.
  useEffect(() => {
    // Em segundo plano o navegador espaça os timers, mas a busca continua.
    const poll = setInterval(refresh, live ? POLL_LIVE_MS : POLL_MS);
    return () => clearInterval(poll);
  }, [refresh, live]);

  useEffect(() => {
    refresh();
    setSeen(readSeen());
    const onVisible = () => document.visibilityState === "visible" && refresh();
    const onSwMessage = (e: MessageEvent) => e.data?.type === "apoio" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(APOIO_REFRESH_EVENT, refresh);
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    // Qualquer toque na tela libera o som (o navegador exige um toque antes).
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    return () => {
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
      setPromptLater(Date.now() - later < 24 * 60 * 60 * 1000);
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

  // Aba minimizada com pedido aberto: o título pisca para chamar a atenção.
  const alertName = othersOpen[0]?.name;
  useEffect(() => {
    if (!alertName) return;
    const original = document.title;
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? `🆘 SOS ${alertName}` : original;
    }, 1000);
    return () => {
      clearInterval(id);
      document.title = original;
    };
  }, [alertName]);

  // Sons: sirene nos primeiros 30s de cada pedido; jingle quando alguém aceita.
  useEffect(() => {
    const audio = sharedAudio();
    const current = Date.now() + offset;
    for (const r of othersOpen) {
      const elapsed = current - r.createdAt;
      if (elapsed < SIREN_MS && !sirened.has(r.id) && !minimized.has(r.id)) {
        sirened.add(r.id);
        navigator.vibrate?.([600, 200, 600, 200, 600]);
        if (audio) {
          audio.resume().catch(() => {});
          sirens.set(r.id, siren(audio, (SIREN_MS - elapsed) / 1000));
        }
      }
      if (elapsed < NOTIFY_WITHIN_MS && !notified.has(r.id)) {
        notified.add(r.id);
        notifyInBackground(r);
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
    const res = await fetch(`/api/apoio/${r.id}/accept`, { method: "POST" }).catch(() => null);
    if (!res) {
      window.alert("Sem internet: não foi possível aceitar o pedido. Tente de novo.");
    } else if (!res.ok) {
      const body = await res.json().catch(() => null);
      window.alert(body?.error ?? "Não foi possível aceitar o pedido.");
    }
    refresh();
  }

  async function cancelMine(r: HelpView) {
    if (!window.confirm("Cancelar seu pedido de apoio?")) return;
    const res = await fetch(`/api/apoio/${r.id}/cancel`, { method: "POST" }).catch(() => null);
    if (!res) window.alert("Sem internet: não foi possível cancelar. Tente de novo.");
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
    let res: Response;
    try {
      res = await fetch("/api/apoio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      });
    } catch {
      setError("Sem internet: o pedido não foi enviado. Ligue os dados móveis ou procure sinal e tente de novo.");
      setModal("confirm");
      return;
    }
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
  const showPushDenied = !promptLater && push === "denied";

  return (
    <>
      {/* Faixas no topo: pedidos minimizados, o meu pedido, "ajuda a caminho", ativar alertas */}
      <div className="fixed inset-x-0 top-0 z-[75] flex flex-col gap-1 p-2">
        {othersOpen
          .filter((r) => minimized.has(r.id))
          .map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => restore(r.id)}
              className="flex animate-sos-glow items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-2.5 text-left text-sm text-white shadow-lg shadow-red-900/30"
            >
              <span className="text-xl">🆘</span>
              <span className="min-w-0 flex-1">
                <strong>{r.name}</strong> pede apoio
                {r.bairro && <span className="block truncate text-base font-bold uppercase">📍 {r.bairro}</span>}
              </span>
              <span className="shrink-0 font-mono tabular-nums">{clock(serverNow - r.createdAt)}</span>
            </button>
          ))}

        {mine && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-700 px-4 py-2.5 text-sm text-white shadow-lg shadow-red-900/30">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              <span>
                Seu pedido de apoio está aberto há <strong className="font-mono tabular-nums">{clock(serverNow - mine.createdAt)}</strong>
              </span>
            </span>
            <button type="button" onClick={() => cancelMine(mine)} className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs ring-1 ring-white/50">
              Cancelar
            </button>
          </div>
        )}

        {accepted.map((r) => (
          <div key={r.id} className="animate-slide-down rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3 text-sm text-white shadow-lg shadow-emerald-900/30">
            <div className="flex items-start justify-between gap-3">
              <p>
                <strong>✅ AJUDA A CAMINHO!</strong>{" "}
                {r.isMine
                  ? `${r.acceptedByName} está indo até você.`
                  : r.iAccepted
                    ? `Você vai apoiar ${r.name}${r.bairro ? ` no ${r.bairro}` : ""}.`
                    : `${r.acceptedByName} vai apoiar ${r.name}.`}{" "}
                Ficou {duration((r.acceptedAt ?? 0) - r.createdAt)} em aberto.
              </p>
              <button type="button" onClick={() => dismissAccepted(r.id)} className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs ring-1 ring-white/50">
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

        {showPushDenied && (
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 text-xs text-ink shadow-lg ring-1 ring-red-200 backdrop-blur">
            <span>
              🔕 <strong>Alertas do SOS bloqueados.</strong> Para receber pedidos com a aba minimizada: toque no cadeado ao
              lado do endereço → Permissões → Notificações → Permitir.
            </span>
            <button type="button" onClick={promptLaterClick} className="shrink-0 text-inkSoft underline">
              Depois
            </button>
          </div>
        )}
      </div>

      {/* Pedido para ativar os alertas: sem isso o SOS só aparece com o app aberto. */}
      {showPushPrompt && !fullScreen && modal === "closed" && (
        <div className="fixed inset-x-0 bottom-0 z-[76] p-3 sm:bottom-4 sm:left-auto sm:right-4 sm:w-96">
          <div className="animate-slide-up rounded-3xl bg-white p-5 shadow-2xl shadow-ink/20 ring-1 ring-black/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-xl text-white shadow-lg shadow-red-600/30">
                🔔
              </span>
              <div>
                <p className="font-display text-base font-bold text-ink">Ative os alertas do SOS DROP</p>
                <p className="mt-0.5 text-sm text-inkSoft">
                  {push === "unsupported"
                    ? "No iPhone: Compartilhar → Adicionar à Tela de Início, e abra o app por lá."
                    : "Receba o pedido de ajuda com som e vibração mesmo com a aba minimizada ou a tela bloqueada."}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {push !== "unsupported" && (
                <button type="button" onClick={enablePush} className="btn-sos flex-1 py-2.5 text-sm">
                  Ativar alertas
                </button>
              )}
              <button type="button" onClick={promptLaterClick} className="btn-ghost flex-1">
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta em tela cheia */}
      {fullScreen && (
        <div
          className="fixed inset-0 z-[78] flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-red-600 via-red-700 to-red-900 px-5 py-8 text-center text-white"
          role="alertdialog"
          aria-label="Pedido de APOIO DROP"
        >
          <div className="pointer-events-none absolute inset-0 animate-sos-flash bg-red-400/40" aria-hidden />
          <div className="relative flex w-full max-w-sm flex-col items-center">
            <p className="rounded-full bg-white/15 px-4 py-1 font-display text-sm font-bold uppercase tracking-[0.3em] ring-1 ring-white/40">
              🆘 SOS Drop
            </p>
            <div className="relative mt-6">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/40" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fullScreen.imageUrl} alt="" className="relative h-24 w-24 rounded-full object-cover ring-4 ring-white" />
            </div>
            <p className="mt-4 font-display text-2xl font-bold">{fullScreen.name}</p>
            <p className="text-sm opacity-90">
              precisa de apoio · <span className="font-mono tabular-nums">{clock(serverNow - fullScreen.createdAt)}</span> aguardando
            </p>

            <div className="mt-5 w-full">
              <PlaceCard r={fullScreen} />
            </div>

            <div className="mt-4 w-full space-y-3">
              <MapButtons r={fullScreen} />
              <button
                type="button"
                onClick={() => accept(fullScreen)}
                className="w-full rounded-2xl bg-white px-4 py-4 font-display text-xl font-bold uppercase text-red-700 shadow-xl shadow-red-950/40 transition active:scale-[0.98]"
              >
                🙋 Vou ajudar
              </button>
              <button type="button" onClick={() => minimize(fullScreen.id)} className="w-full py-2 text-sm text-white/90 underline">
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
          className="fixed bottom-[calc(1rem+var(--statusbar-h,0px))] right-4 z-[65] rounded-2xl bg-white/80 px-4 py-2 text-left font-display text-xs font-bold uppercase leading-tight tracking-wide text-inkSoft shadow-lg ring-1 ring-black/5 backdrop-blur"
        >
          🆘 SOS Drop
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
          className="group fixed bottom-[calc(1rem+var(--statusbar-h,0px))] right-4 z-[65] flex items-center gap-2 rounded-full bg-gradient-to-br from-red-500 to-red-700 py-3 pl-3 pr-5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-xl shadow-red-600/40 transition active:scale-95"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/30" aria-hidden />
            <span className="relative text-xs">SOS</span>
          </span>
          Apoio Drop
        </button>
      )}

      {/* Confirmação do pedido */}
      {modal !== "closed" && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => modal === "confirm" && setModal("closed")}
        >
          <div className="w-full max-w-sm animate-slide-up rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 font-display text-lg font-bold text-white shadow-lg shadow-red-600/40">
              SOS
            </span>
            <p className="mt-3 font-display text-2xl font-bold text-ink">Pedir apoio?</p>
            <p className="mt-2 text-sm text-inkSoft">
              Todos os técnicos vão receber um alerta com a sua <strong className="text-ink">localização exata</strong> e o bairro.
            </p>
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button
              type="button"
              onClick={requestHelp}
              disabled={modal !== "confirm"}
              className="btn-sos mt-5 w-full py-4 text-lg"
            >
              {modal === "locating" ? "Pegando localização…" : modal === "sending" ? "Enviando…" : "🆘 Pedir apoio"}
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
