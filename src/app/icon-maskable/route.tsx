import { ImageResponse } from "next/og";

export const runtime = "edge";

// Ícone "maskable" 512x512 do manifest: fundo sem cantos (o Android recorta no formato
// do aparelho) e o selo "OS" dentro da área segura central.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#C1502E",
          color: "#EDEFE8",
          fontSize: 200,
          fontWeight: 700,
        }}
      >
        OS
      </div>
    ),
    { width: 512, height: 512 }
  );
}
