import { ImageResponse } from "next/og";

export const runtime = "edge";

// Ícone pequeno da barra de status do Android nas notificações do SOS. O Android usa
// só o contorno (canal alfa), então é "SOS" branco em fundo transparente.
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
          color: "white",
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        SOS
      </div>
    ),
    { width: 96, height: 96 }
  );
}
