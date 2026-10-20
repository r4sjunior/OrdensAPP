import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/apoio/:id/card -> cartão vermelho grande que aparece dentro da notificação
// do Android (campo `image`). Público de propósito: o celular baixa a imagem sem a
// sessão do app. Só mostra nome e bairro, e o id do pedido não é adivinhável.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const r = await prisma.helpRequest.findUnique({
    where: { id: params.id },
    select: { name: true, bairro: true, address: true, city: true },
  });
  const name = r?.name ?? "Técnico";
  const bairro = r?.bairro ?? "Localização no mapa";
  const detail = [r?.address, r?.city].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 56px",
          color: "white",
          background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 55%, #7f1d1d 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 92,
              height: 92,
              borderRadius: 999,
              background: "white",
              color: "#b91c1c",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            SOS
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 6, opacity: 0.9 }}>APOIO DROP</div>
            <div style={{ fontSize: 40, fontWeight: 800 }}>{name}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, opacity: 0.85, letterSpacing: 4 }}>BAIRRO</div>
          <div style={{ fontSize: bairro.length > 22 ? 58 : 76, fontWeight: 800, lineHeight: 1.05 }}>
            {bairro.toUpperCase()}
          </div>
          {detail && <div style={{ marginTop: 10, fontSize: 30, opacity: 0.95 }}>{detail}</div>}
        </div>
      </div>
    ),
    { width: 1024, height: 512, headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
