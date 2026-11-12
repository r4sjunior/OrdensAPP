import localFont from "next/font/local";

// Fonte 8-bit usada na chamada e na roleta do sorteio (arquivo local, sem depender do Google Fonts).
export const pixelFont = localFont({
  src: "../app/fonts/PressStart2P-400.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});
