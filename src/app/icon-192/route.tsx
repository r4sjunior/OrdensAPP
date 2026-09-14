import { ImageResponse } from "next/og";

export const runtime = "edge";

// Ícone 192x192 usado pelo manifest (atalho/instalação no Android/Chrome).
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
          borderRadius: 40,
          color: "#EDEFE8",
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        OS
      </div>
    ),
    { width: 192, height: 192 }
  );
}
