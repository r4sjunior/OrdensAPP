import { ImageResponse } from "next/og";

export const runtime = "edge";

// Ícone pequeno da barra de status do Android no aviso do sorteio. O Android usa só o
// contorno (canal alfa), então é uma caneca branca em fundo transparente.
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* espuma + corpo da caneca */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 52, height: 14, background: "white", borderRadius: 7 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 44, height: 50, background: "white", borderRadius: "0 0 6px 6px" }} />
            {/* alça */}
            <div style={{ width: 16, height: 30, border: "7px solid white", borderLeft: "none", borderRadius: "0 10px 10px 0" }} />
          </div>
        </div>
      </div>
    ),
    { width: 96, height: 96 }
  );
}
