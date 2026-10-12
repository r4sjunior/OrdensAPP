import { auth } from "@clerk/nextjs/server";
import { subscribeApoio, type ApoioEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Fecha um pouco antes do limite da função; o navegador reconecta sozinho.
const STREAM_MS = 280_000;
const HEARTBEAT_MS = 25_000;

// GET /api/apoio/stream -> Server-Sent Events: avisa a tela na hora em que um pedido
// é criado, aceito ou cancelado. A tela então busca /api/apoio (que já filtra o que
// cada um pode ver). 503 = tempo real indisponível, a tela fica na busca periódica.
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Não autenticado", { status: 401 });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  let unsubscribe: () => void;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const send = (chunk: string) => {
    try {
      controllerRef?.enqueue(encoder.encode(chunk));
    } catch {
      cleanup();
    }
  };

  try {
    unsubscribe = await subscribeApoio(
      (event: ApoioEvent) => send(`event: apoio\ndata: ${JSON.stringify(event)}\n\n`),
      () => cleanup()
    );
  } catch (err) {
    console.error("[realtime] stream indisponível", err);
    return new Response("Tempo real indisponível", { status: 503 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      const heartbeat = setInterval(() => send(`: ping\n\n`), HEARTBEAT_MS);
      const timeout = setTimeout(() => cleanup(), STREAM_MS);
      let closed = false;
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(timeout);
        unsubscribe();
        req.signal.removeEventListener("abort", cleanup);
        try {
          controller.close();
        } catch {
          // já fechado pelo navegador
        }
      };
      req.signal.addEventListener("abort", cleanup);
      send(`retry: 3000\nevent: ready\ndata: {}\n\n`);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
