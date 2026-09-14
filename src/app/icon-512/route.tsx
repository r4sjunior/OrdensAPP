import { ImageResponse } from "next/og";

export const runtime = "edge";

// Ícone 512x512 usado pelo manifest (atalho/instalação no Android/Chrome).
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
          borderRadius: 108,
          color: "#EDEFE8",
          fontSize: 256,
          fontWeight: 700,
        }}
      >
        OS
      </div>
    ),
    { width: 512, height: 512 }
  );
}
