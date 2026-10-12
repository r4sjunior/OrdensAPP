// Tempo real do APOIO DROP: Postgres LISTEN/NOTIFY + Server-Sent Events.
//
// Quem pede/aceita/cancela chama `publishApoio` (um pg_notify pelo Prisma — funciona
// também pela conexão com pooler). Cada instância do servidor mantém UMA conexão
// direta escutando o canal e repassa o aviso para todas as telas abertas nela
// (rota /api/apoio/stream). Nenhuma tabela nova: o aviso não é guardado, a tela só
// busca de novo o /api/apoio ao receber.
import { Client } from "pg";
import { prisma } from "./prisma";

const CHANNEL = "apoio_drop";

export type ApoioEvent = {
  type: "created" | "accepted" | "cancelled";
  id: string;
};

type Listener = (event: ApoioEvent) => void;
type ErrorListener = () => void;

// Avisa todas as telas. Nunca derruba a rota que chamou: se falhar, as telas
// recebem pelo push / pela busca periódica.
export async function publishApoio(event: ApoioEvent) {
  try {
    await prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify(event)})`;
  } catch (err) {
    console.error("[realtime] pg_notify falhou", err);
  }
}

// ---- Escuta compartilhada por instância -------------------------------------

const listeners = new Set<Listener>();
const errorListeners = new Set<ErrorListener>();
let current: { client: Client; ready: Promise<Client> } | null = null;

function connectionString(): string | undefined {
  // LISTEN precisa de conexão direta (o pooler do Neon/PgBouncer não repassa NOTIFY).
  return process.env.DIRECT_URL || process.env.DATABASE_URL;
}

function closeConnection(client: Client, failed: boolean) {
  if (current?.client !== client) return; // já foi trocada por outra
  current = null;
  client.removeAllListeners("notification");
  client.end().catch(() => {});
  // As telas conectadas reconectam sozinhas (EventSource) e abrem uma escuta nova.
  if (failed) errorListeners.forEach((fn) => fn());
}

function ensureListening(): Promise<Client> {
  if (current) return current.ready;
  const url = connectionString();
  if (!url) return Promise.reject(new Error("DIRECT_URL/DATABASE_URL não definida"));

  const client = new Client({ connectionString: url, keepAlive: true });
  client.on("notification", (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) return;
    let event: ApoioEvent;
    try {
      event = JSON.parse(msg.payload);
    } catch {
      return;
    }
    listeners.forEach((fn) => fn(event));
  });
  client.on("error", (err) => {
    console.error("[realtime] conexão LISTEN caiu", err);
    closeConnection(client, true);
  });
  client.on("end", () => closeConnection(client, true));

  const ready = (async () => {
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    return client;
  })();
  current = { client, ready };
  ready.catch(() => closeConnection(client, true));
  return ready;
}

// Inscreve uma tela. Retorna a função para sair; a última a sair fecha a conexão.
export async function subscribeApoio(onEvent: Listener, onError: ErrorListener): Promise<() => void> {
  listeners.add(onEvent);
  errorListeners.add(onError);
  const unsubscribe = () => {
    listeners.delete(onEvent);
    errorListeners.delete(onError);
    if (listeners.size === 0 && current) closeConnection(current.client, false);
  };
  try {
    await ensureListening();
  } catch (err) {
    unsubscribe();
    throw err;
  }
  return unsubscribe;
}
