"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { APOIO_END, APOIO_START, LOCATION_MAX_AGE_MS, LOCATION_STALE_MS } from "@/lib/apoioHours";
import type { TeamMapData, TeamMember } from "@/lib/teamMap";
import type { HelpView } from "@/lib/apoio";
import { MY_LOCATION_EVENT, type MyLocation } from "./LocationShare";

const REFRESH_MS = 10_000;

type L = typeof import("leaflet");

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0).replace(".", ",")} km`;
}

const fmtClock = (t: number) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(t);

// "agora" / "há 4 min" enquanto está ao vivo; depois "última vez às 14:32".
function fmtAgo(ms: number, at: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return "agora";
  if (ms <= LOCATION_STALE_MS) return `há ${Math.floor(s / 60)} min`;
  return `última vez às ${fmtClock(at)}`;
}

const firstName = (n: string) => n.split(" ")[0] || n;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Carrinho da Telecom com escada no teto (vista lateral).
function vanSvg(stripe: string) {
  return `
<svg viewBox="0 0 64 40" width="54" height="34" aria-hidden="true">
  <g stroke="#1A2326" stroke-width="1.2" stroke-linejoin="round">
    <rect x="15" y="10.5" width="2.5" height="4" fill="#5A6769" stroke="none"/>
    <rect x="38" y="10.5" width="2.5" height="4" fill="#5A6769" stroke="none"/>
    <path d="M6 30 V18 Q6 14 10 14 H43 L52 20 Q59 21 59 26 V30 Q59 32 57 32 H8 Q6 32 6 30 Z" fill="#ffffff"/>
    <path d="M44 16.8 L50.5 21 V23.5 H44 Z" fill="#9CC7D9"/>
    <rect x="10" y="17" width="13" height="6.5" rx="1.2" fill="#9CC7D9"/>
    <rect x="26" y="17" width="14" height="6.5" rx="1.2" fill="#9CC7D9"/>
  </g>
  <rect x="6.6" y="25.5" width="52" height="3" fill="${stripe}"/>
  <rect x="55.5" y="26" width="3" height="2" rx="0.6" fill="#F5C343"/>
  <g fill="none" stroke="#8A9496" stroke-width="1.6" stroke-linecap="round">
    <line x1="9" y1="5" x2="49" y2="5"/>
    <line x1="9" y1="10.5" x2="49" y2="10.5"/>
    ${[12, 17, 22, 27, 32, 37, 42, 47].map((x) => `<line x1="${x}" y1="5" x2="${x}" y2="10.5"/>`).join("")}
  </g>
  <g>
    <circle cx="18" cy="32" r="5" fill="#1A2326"/><circle cx="18" cy="32" r="2" fill="#C9CFCF"/>
    <circle cx="47" cy="32" r="5" fill="#1A2326"/><circle cx="47" cy="32" r="2" fill="#C9CFCF"/>
  </g>
</svg>`;
}

function memberIcon(L: L, m: TeamMember, highlight: boolean, stale: boolean) {
  const stripe = m.isMe ? "#2F6E62" : "#D9552C";
  const avatar = m.imageUrl
    ? `<img src="${esc(m.imageUrl)}" alt="" class="tm-avatar${m.isMe ? " tm-me" : ""}"/>`
    : `<span class="tm-avatar tm-avatar-empty${m.isMe ? " tm-me" : ""}">${esc(firstName(m.name).slice(0, 1))}</span>`;
  return L.divIcon({
    className: "",
    html: `<div class="tm-marker${stale ? " tm-stale" : ""}${highlight ? " tm-near" : ""}">
      ${avatar}
      ${vanSvg(stripe)}
      <span class="tm-name">${esc(m.isMe ? "Você" : firstName(m.name))}</span>
      ${stale ? `<span class="tm-time">${fmtClock(m.updatedAt)}</span>` : ""}
    </div>`,
    iconSize: [80, 98],
    iconAnchor: [40, 64],
  });
}

function sosIcon(L: L, r: HelpView) {
  return L.divIcon({
    className: "",
    html: `<div class="tm-sos">
      <span class="tm-sos-ring"></span>
      <img src="${esc(r.imageUrl)}" alt="" />
      <span class="tm-sos-label">🆘 ${esc(firstName(r.name))}</span>
    </div>`,
    iconSize: [80, 80],
    iconAnchor: [40, 30],
  });
}

export default function TeamMap() {
  const [data, setData] = useState<TeamMapData | null>(null);
  const [me, setMe] = useState<MyLocation | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const libRef = useRef<L | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);

  // ---- dados ---------------------------------------------------------------
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/location", { cache: "no-store" });
      if (!res.ok) return;
      const d: TeamMapData = await res.json();
      setData(d);
      setOffset(d.serverNow - Date.now());
    } catch {
      // sem rede: mantém o último
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    const c = setInterval(() => setNow(Date.now()), 15_000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      clearInterval(c);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  // Posição deste aparelho: vem do LocationShare (no cabeçalho) e, para não esperar, pede uma vez aqui.
  useEffect(() => {
    const onMe = (e: Event) => setMe((e as CustomEvent<MyLocation>).detail);
    window.addEventListener(MY_LOCATION_EVENT, onMe);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null }),
        (err) =>
          setGeoError(
            err.code === err.PERMISSION_DENIED
              ? "Localização bloqueada: toque no cadeado ao lado do endereço → Permissões → Localização → Permitir."
              : "Não foi possível pegar sua localização agora."
          ),
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 }
      );
    } else {
      setGeoError("Este aparelho não informa a localização.");
    }
    return () => window.removeEventListener(MY_LOCATION_EVENT, onMe);
  }, []);

  // ---- mapa ----------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !boxRef.current || mapRef.current) return;
      libRef.current = L;
      const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true }).setView([-15.78, -47.93], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: "abc",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  const serverNow = now + offset;

  // Lista com a minha posição mais recente (a do aparelho vale mais que a do servidor).
  const members = useMemo(() => {
    const list = (data?.members ?? [])
      .filter((m) => m.isMe || serverNow - m.updatedAt <= LOCATION_MAX_AGE_MS)
      .map((m) =>
      m.isMe && me ? { ...m, lat: me.lat, lng: me.lng, accuracy: me.accuracy, updatedAt: serverNow } : m
    );
    return list;
  }, [data, me, serverNow]);

  const sos = data?.sos ?? [];
  const target = sos[0] ?? null; // SOS aberto mais antigo vira a referência
  const ref = target ? { lat: target.lat, lng: target.lng } : me;

  const ranked = useMemo(() => {
    // Com SOS: todos (menos quem pediu) por distância até o SOS. Sem SOS: os outros por
    // distância até mim, e eu no fim.
    const list = members.filter((m) => !(m.isMe && (target ? target.isMine : true)));
    const mine = members.filter((m) => m.isMe && !target);
    if (!ref) return [...list, ...mine].map((m) => ({ m, d: null as number | null }));
    return [
      ...list.map((m) => ({ m, d: distanceM(ref, m) as number | null })).sort((a, b) => a.d! - b.d!),
      ...mine.map((m) => ({ m, d: null as number | null })),
    ];
  }, [members, ref, target]);

  const nearestId = useMemo(() => {
    const cand = ranked.filter((r) => !r.m.isMe && r.d !== null);
    return cand.length ? cand.reduce((a, b) => (b.d! < a.d! ? b : a)).m.userId : null;
  }, [ranked]);

  // Desenha/atualiza os marcadores.
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;

    const seen = new Set<string>();
    for (const m of members) {
      const key = `u:${m.userId}`;
      seen.add(key);
      const stale = serverNow - m.updatedAt > LOCATION_STALE_MS;
      const icon = memberIcon(L, m, m.userId === nearestId, stale);
      const existing = markersRef.current.get(key);
      if (existing) {
        existing.setLatLng([m.lat, m.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(m.isMe ? 500 : 0);
      } else {
        const mk = L.marker([m.lat, m.lng], { icon, zIndexOffset: m.isMe ? 500 : 0 }).addTo(layer);
        markersRef.current.set(key, mk);
      }
      markersRef.current
        .get(key)!
        .bindPopup(
          `<strong>${esc(m.isMe ? "Você" : m.name)}</strong><br/>${fmtAgo(serverNow - m.updatedAt, m.updatedAt)}${
            m.accuracy ? ` · ±${Math.round(m.accuracy)} m` : ""
          }${
            !m.isMe
              ? `<br/><a href="https://waze.com/ul?ll=${m.lat},${m.lng}&navigate=yes" target="_blank" rel="noreferrer">🚗 Ir com Waze</a>`
              : ""
          }`
        );
    }
    for (const r of sos) {
      const key = `s:${r.id}`;
      seen.add(key);
      const existing = markersRef.current.get(key);
      if (existing) existing.setLatLng([r.lat, r.lng]);
      else {
        const mk = L.marker([r.lat, r.lng], { icon: sosIcon(L, r), zIndexOffset: 1000 }).addTo(layer);
        mk.bindPopup(
          `<strong>🆘 ${esc(r.name)}</strong> precisa de apoio${r.bairro ? `<br/>📍 ${esc(r.bairro)}` : ""}<br/><a href="https://waze.com/ul?ll=${r.lat},${r.lng}&navigate=yes" target="_blank" rel="noreferrer">🚗 Ir com Waze</a>`
        );
        markersRef.current.set(key, mk);
      }
    }
    // Meu ponto antes do servidor conhecer (1ª posição do dia ainda não chegou).
    if (me && !members.some((m) => m.isMe)) {
      const key = "me:local";
      seen.add(key);
      const fake: TeamMember = { userId: "me", name: "Você", imageUrl: "", lat: me.lat, lng: me.lng, accuracy: me.accuracy, updatedAt: serverNow, isMe: true };
      const existing = markersRef.current.get(key);
      if (existing) existing.setLatLng([me.lat, me.lng]);
      else markersRef.current.set(key, L.marker([me.lat, me.lng], { icon: memberIcon(L, fake, false, false), zIndexOffset: 500 }).addTo(layer));
    }
    markersRef.current.forEach((mk, key) => {
      if (!seen.has(key)) {
        layer.removeLayer(mk);
        markersRef.current.delete(key);
      }
    });

    // Enquadra uma vez, quando chegam os primeiros pontos; depois respeita o zoom do usuário.
    if (!fittedRef.current) {
      const pts: [number, number][] = [
        ...members.map((m) => [m.lat, m.lng] as [number, number]),
        ...sos.map((r) => [r.lat, r.lng] as [number, number]),
        ...(me ? [[me.lat, me.lng] as [number, number]] : []),
      ];
      if (pts.length === 1) {
        map.setView(pts[0], 14);
        fittedRef.current = true;
      } else if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 15 });
        fittedRef.current = true;
      }
    }
  }, [ready, members, sos, me, nearestId, serverNow]);

  function flyTo(lat: number, lng: number, key?: string) {
    mapRef.current?.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 15), { duration: 0.6 });
    if (key) setTimeout(() => markersRef.current.get(key)?.openPopup(), 650);
    boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function showAll() {
    const L = libRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const pts: [number, number][] = [
      ...members.map((m) => [m.lat, m.lng] as [number, number]),
      ...sos.map((r) => [r.lat, r.lng] as [number, number]),
      ...(me ? [[me.lat, me.lng] as [number, number]] : []),
    ];
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 15 });
  }

  const closed = data && !data.open;
  const others = members.filter((m) => !m.isMe).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Mapa da equipe</h1>
          <p className="text-sm text-inkSoft">
            Localização em tempo real para o SOS DROP · {APOIO_START} às {APOIO_END}
          </p>
        </div>
        {!closed && (
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-inkSoft shadow-soft ring-1 ring-black/5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <strong className="font-mono text-ink">{others}</strong> técnico{others === 1 ? "" : "s"} no mapa
          </span>
        )}
      </div>

      {closed && (
        <div className="card p-6 text-center">
          <p className="text-4xl">🌙</p>
          <p className="mt-2 font-display text-lg font-bold text-ink">Mapa fechado agora</p>
          <p className="mt-1 text-sm text-inkSoft">
            A localização dos técnicos só fica disponível das <strong>{APOIO_START}</strong> às{" "}
            <strong>{APOIO_END}</strong>. Fora desse horário ninguém aparece no mapa.
          </p>
        </div>
      )}

      {target && (
        <div className="animate-slide-down rounded-2xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 text-sm text-white shadow-lg shadow-red-900/30">
          <p>
            <strong>🆘 {target.isMine ? "Seu pedido de apoio está aberto." : `${target.name} precisa de apoio`}</strong>
            {target.bairro ? ` · ${target.bairro}` : ""}
          </p>
          <p className="mt-0.5 text-white/90">A lista abaixo está ordenada pela distância até o SOS.</p>
          <button type="button" onClick={() => flyTo(target.lat, target.lng, `s:${target.id}`)} className="mt-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/50">
            Ver SOS no mapa
          </button>
        </div>
      )}

      {geoError && !closed && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">📍 {geoError}</p>
      )}

      <div className={`relative isolate overflow-hidden rounded-3xl shadow-lift ring-1 ring-black/5 ${closed ? "hidden" : ""}`}>
        <div ref={boxRef} className="h-[58vh] min-h-[320px] w-full bg-paperDim" />
        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-2">
          {me && (
            <button type="button" onClick={() => flyTo(me.lat, me.lng)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-lg ring-1 ring-black/10">
              📍 Eu
            </button>
          )}
          <button type="button" onClick={showAll} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-lg ring-1 ring-black/10">
            👥 Todos
          </button>
        </div>
      </div>

      {!closed && (
        <div className="card divide-y divide-line overflow-hidden">
          <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-inkSoft">
            {target ? "Mais perto do SOS" : me ? "Mais perto de você" : "Técnicos"}
          </p>
          {ranked.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-inkSoft">
              {data ? "Nenhum técnico com o app aberto agora." : "Carregando…"}
            </p>
          )}
          {ranked.map(({ m, d }) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => flyTo(m.lat, m.lng, `u:${m.userId}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper"
            >
              {m.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paperDim text-sm font-bold text-inkSoft">
                  {m.name.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">
                  {m.isMe ? "Você" : m.name}
                  {m.userId === nearestId && (
                    <span className="ml-2 rounded-full bg-stamp/10 px-2 py-0.5 text-[10px] font-bold uppercase text-stamp">
                      Mais perto
                    </span>
                  )}
                </span>
                <span className="block text-xs text-inkSoft">{serverNow - m.updatedAt > LOCATION_STALE_MS ? "" : "atualizado "}
                  {fmtAgo(serverNow - m.updatedAt, m.updatedAt)}</span>
              </span>
              {d !== null && (
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">{fmtDistance(d)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!closed && (
        <p className="text-center text-xs text-inkSoft">
          Sua localização é atualizada enquanto o app está aberto, das {APOIO_START} às {APOIO_END}. Com o app
          fechado, a equipe vê o último lugar onde você estava por até 30 min.
        </p>
      )}
    </div>
  );
}
