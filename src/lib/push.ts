// Notificações push (Web Push): chegam mesmo com o app fechado / tela bloqueada.
// Chaves VAPID nas variáveis NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.
import webpush from "web-push";
import { prisma } from "./prisma";

export type PushPayload = {
  title: string;
  body: string;
  tag: string; // notificações com a mesma tag se substituem
  url: string; // onde abrir ao tocar
  urgent?: boolean; // fica na tela até a pessoa mexer
  silent?: boolean; // sem som/vibração (ex: pedido cancelado)
  // Campos lidos pelo service worker (public/sw.js). Opcionais: aparelhos com o sw
  // antigo simplesmente ignoram.
  kind?: "apoio-created" | "apoio-accepted" | "apoio-cancelled" | "apoio-test";
  requestId?: string;
  lat?: number; // com lat/lng a notificação ganha o botão "Abrir no Maps"
  lng?: number;
  image?: string; // imagem grande (cartão vermelho do SOS) na notificação do Android
};

let configured = false;

export function pushConfigured(): boolean {
  return configure();
}

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  webpush.setVapidDetails(site ? `https://${site}` : "https://localhost", publicKey, privateKey);
  configured = true;
  return true;
}

// Envia para todos os aparelhos inscritos (menos os de `exceptUserId`). Inscrições
// que o navegador já invalidou (404/410) são removidas. Devolve quantos aparelhos
// receberam.
export async function pushToAll(payload: PushPayload, exceptUserId?: string): Promise<number> {
  return send(payload, exceptUserId ? { userId: { not: exceptUserId } } : {});
}

// Só os aparelhos de um usuário (botão "Testar alerta" do /perfil).
export async function pushToUser(payload: PushPayload, userId: string): Promise<number> {
  return send(payload, { userId });
}

async function send(payload: PushPayload, where: { userId?: string | { not: string } }): Promise<number> {
  if (!configure()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where });
  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let delivered = 0;

  await Promise.allSettled(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 30,
          urgency: "high",
        })
        .then(() => {
          delivered++;
        })
        .catch((err: { statusCode?: number }) => {
          if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
        })
    )
  );

  if (dead.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
  }
  return delivered;
}
