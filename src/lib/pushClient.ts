// Lado do navegador das notificações push do APOIO DROP.

export type PushStatus =
  | "unsupported" // navegador sem push (ex: iPhone sem o app instalado na tela inicial)
  | "denied" // a pessoa bloqueou
  | "prompt" // ainda não perguntamos
  | "granted";

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  );
}

export function pushStatus(): PushStatus {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "granted";
  return "prompt";
}

// iPhone/iPad fora do app instalado: push só funciona depois de "Adicionar à Tela de Início".
export function isIosBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

// Registra o service worker e a inscrição deste aparelho no servidor.
// `ask` = pode mostrar o pedido de permissão (só dentro de um toque na tela).
export async function ensurePushSubscription(ask: boolean): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "default") {
    if (!ask) return "prompt";
    const result = await Notification.requestPermission();
    if (result !== "granted") return result === "denied" ? "denied" : "prompt";
  }
  if (Notification.permission !== "granted") return "denied";

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    }));

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  return "granted";
}
