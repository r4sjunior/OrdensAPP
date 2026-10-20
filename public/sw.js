// Service worker do Ordens (PWA).
//
// 1. Cache: só o "esqueleto" do app. Os arquivos de /_next/static (têm hash no nome,
//    nunca mudam) e os ícones ficam guardados; as páginas são buscadas SEMPRE na rede
//    primeiro (o app continua pegando a versão nova) e a última cópia só é usada sem
//    internet. /api/* nunca passa pelo cache: dados dos usuários são sempre do servidor.
// 2. Push: alertas do APOIO DROP chegam mesmo com o app fechado.
//
// Ao mudar a estratégia de cache, troque VERSION: os caches antigos são apagados
// (só os deste app — nada que o usuário salvou fica no cache).

const VERSION = "v3";
const STATIC_CACHE = `ordens-static-${VERSION}`;
const PAGES_CACHE = `ordens-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_PAGES = 15;

const PRECACHE = [OFFLINE_URL, "/icon-192", "/icon-512", "/badge-sos", "/manifest.webmanifest"];
// Páginas que não devem ficar guardadas no aparelho.
const NO_CACHE_PAGES = [/^\/adm/, /^\/sign-/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      // Um item que falhar não impede a instalação (o push precisa do sw ativo).
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("ordens-") && k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---- Cache -------------------------------------------------------------------

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /^\/(icon(-\d+|-maskable)?|apple-icon|badge-sos)$/.test(url.pathname) ||
    /^\/rose-\d+\.png$/.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest"
  );
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

// Arquivos com hash: cache primeiro. Ícones/manifest: devolve o guardado e atualiza por trás.
async function staticResponse(event, url) {
  const { request } = event;
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const immutable = url.pathname.startsWith("/_next/static/");
  if (cached && immutable) return cached;

  const network = fetch(request)
    .then((res) => {
      // Em `next dev` os arquivos não têm hash (não vêm "immutable"): não guarda.
      const keep = res.ok && (!immutable || /immutable/.test(res.headers.get("Cache-Control") || ""));
      if (keep) return cache.put(request, res.clone()).then(() => res);
      return res;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || Response.error();
}

// Páginas: rede primeiro; sem internet usa a última cópia ou a página offline.
async function pageResponse(request, url) {
  try {
    const res = await fetch(request);
    const cacheable =
      res.ok && !res.redirected && res.type === "basic" && !NO_CACHE_PAGES.some((re) => re.test(url.pathname));
    if (cacheable) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(url.pathname, res.clone());
      trimCache(PAGES_CACHE, MAX_PAGES);
    }
    return res;
  } catch (err) {
    const cached = await caches.match(url.pathname, { cacheName: PAGES_CACHE });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL, { cacheName: STATIC_CACHE });
    if (offline) return offline;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Clerk, Google Maps etc.
  if (url.pathname.startsWith("/api/")) return; // dados: sempre do servidor
  if (url.pathname.startsWith("/kb/")) return; // vídeos/apk grandes da Rose

  if (request.mode === "navigate") {
    event.respondWith(pageResponse(request, url));
    return;
  }
  // Navegação interna do Next (RSC) depende da sessão: não guarda.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (isStaticAsset(url)) event.respondWith(staticResponse(event, url));
});

// ---- Push --------------------------------------------------------------------
// Formato enviado pelo servidor: src/lib/push.ts (PushPayload).

function notifyOpenWindows(message) {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => clients.forEach((c) => c.postMessage(message)));
}

// Vibração longa e insistente para o SOS (o Android toca o som de notificação junto).
const SOS_VIBRATE = [800, 250, 800, 250, 800, 250, 800, 250, 1200];

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Ordens", body: event.data ? event.data.text() : "" };
  }

  const hasLocation = typeof data.lat === "number" && typeof data.lng === "number";
  const options = {
    body: data.body || "",
    tag: data.tag || "ordens",
    renotify: !data.silent,
    silent: !!data.silent,
    requireInteraction: !!data.urgent,
    icon: "/icon-192",
    badge: "/badge-sos",
    image: data.image || undefined,
    vibrate: data.silent ? undefined : data.urgent ? SOS_VIBRATE : [200, 100, 200],
    timestamp: Date.now(),
    actions: hasLocation
      ? [
          { action: "maps", title: "📍 Abrir no Maps" },
          { action: "open", title: "🙋 Ver e ajudar" },
        ]
      : [],
    data: {
      url: data.url || "/dashboard",
      kind: data.kind || null,
      requestId: data.requestId || null,
      lat: hasLocation ? data.lat : null,
      lng: hasLocation ? data.lng : null,
    },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Ordens", options),
      // Se o app estiver aberto (mesmo em segundo plano), avisa a aba para atualizar e
      // tocar a sirene.
      notifyOpenWindows({ type: "apoio", kind: options.data.kind, requestId: options.data.requestId }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  if (event.action === "maps" && data.lat !== null && data.lng !== null) {
    event.waitUntil(
      self.clients.openWindow(`https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`)
    );
    return;
  }

  const url = data.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) {
          c.postMessage({ type: "apoio", kind: data.kind, requestId: data.requestId });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// O navegador trocou a inscrição (expirou/renovou): inscreve de novo com a mesma chave.
// Se a sessão tiver expirado o servidor recusa, e a inscrição é refeita na próxima vez
// que o app abrir (ensurePushSubscription em src/lib/pushClient.ts).
self.addEventListener("pushsubscriptionchange", (event) => {
  const key = event.oldSubscription && event.oldSubscription.options.applicationServerKey;
  if (!key) return;
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: key })
      .then((sub) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(sub.toJSON()),
        })
      )
      .catch(() => {})
  );
});
