import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { pushConfigured, pushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

// POST /api/push/test -> manda um alerta de teste só para os aparelhos de quem pediu.
// Serve para conferir o caminho inteiro (chaves no servidor, inscrição, notificação).
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "O servidor está sem as chaves de notificação (VAPID). Avise o administrador." },
      { status: 503 }
    );
  }
  const sent = await pushToUser(
    {
      title: "🆘 SOS DROP · TESTE",
      body: "Teste de alerta: é assim que um pedido de apoio vai chegar.\n📍 Bairro · Rua, número",
      tag: "apoio-teste",
      url: "/perfil",
      urgent: true,
      kind: "apoio-test",
    },
    userId
  );
  if (sent === 0) {
    return NextResponse.json(
      { error: "Nenhum aparelho seu está inscrito. Toque em “Ativar alertas” e tente de novo." },
      { status: 404 }
    );
  }
  return NextResponse.json({ sent });
}
