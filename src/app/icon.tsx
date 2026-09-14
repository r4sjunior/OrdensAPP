import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon da aba do navegador — mesmo selo "OS" usado no cabeçalho do app.
export default function Icon() {
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
          borderRadius: 7,
          color: "#EDEFE8",
          fontSize: 17,
          fontWeight: 700,
        }}
      >
        OS
      </div>
    ),
    { ...size }
  );
}
