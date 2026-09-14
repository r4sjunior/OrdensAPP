import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícone usado pelo iOS ao "Adicionar à Tela de Início".
// Sem cantos arredondados aqui: o próprio iOS aplica a máscara.
export default function AppleIcon() {
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
          fontSize: 88,
          fontWeight: 700,
        }}
      >
        OS
      </div>
    ),
    { ...size }
  );
}
