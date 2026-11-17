"use client";

import { useEffect } from "react";
import { apoioWindow } from "@/lib/apoioHours";

// Evento com a posição deste aparelho (o mapa usa na hora, sem esperar o servidor).
export const MY_LOCATION_EVENT = "location:me";
export type MyLocation = { lat: number; lng: number; accuracy: number | null };

const MIN_INTERVAL_MS = 20_000; // não envia mais que isso…
const MAX_INTERVAL_MS = 60_000; // …e envia pelo menos isso, mesmo parado
const MIN_MOVE_M = 25;

function distanceM(a: MyLocation, b: MyLocation) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Compartilha a localização com o mapa da equipe enquanto o app está aberto,
// só das 07:40 às 20:00. Fora do horário o GPS nem é ligado.
export default function LocationShare() {
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    let watchId: number | null = null;
    let last: MyLocation | null = null;
    let lastSent: MyLocation | null = null;
    let lastSentAt = 0;
    let sending = false;

    async function send(pos: MyLocation, force = false) {
      const now = Date.now();
      if (sending) return;
      if (!force && lastSent) {
        const moved = distanceM(lastSent, pos);
        const elapsed = now - lastSentAt;
        if (elapsed < MIN_INTERVAL_MS) return;
        if (moved < MIN_MOVE_M && elapsed < MAX_INTERVAL_MS) return;
      }
      sending = true;
      try {
        const res = await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pos),
        });
        if (res.ok) {
          lastSent = pos;
          lastSentAt = now;
        }
      } catch {
        // sem rede: tenta no próximo
      } finally {
        sending = false;
      }
    }

    function start() {
      if (watchId !== null) return;
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          last = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? null };
          window.dispatchEvent(new CustomEvent<MyLocation>(MY_LOCATION_EVENT, { detail: last }));
          send(last);
        },
        () => {
          // permissão negada ou GPS indisponível: o mapa avisa
        },
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 }
      );
    }

    function stop() {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    function check() {
      if (apoioWindow().open) start();
      else stop();
    }

    // Parado no mesmo lugar o watch não dispara: reenvia a última posição de tempos em tempos.
    const tick = setInterval(() => {
      check();
      if (watchId !== null && last) send(last);
    }, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        check();
        if (last && watchId !== null) send(last, true);
      }
    };

    check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      stop();
    };
  }, []);

  return null;
}
