"use client";

import { useEffect } from "react";

// Registra o service worker (public/sw.js) para todo mundo: deixa o app instalável,
// abre sem internet e já fica pronto para os alertas push do APOIO DROP.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Em `next dev` o cache atrapalha ver as mudanças; teste o PWA com build + start.
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
