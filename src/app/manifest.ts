import type { MetadataRoute } from "next";

// Manifest do PWA (instalável no Android, iPhone e desktop). O service worker fica em
// public/sw.js e é registrado por components/ServiceWorkerRegister.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ordens de Serviço",
    short_name: "Ordens OS",
    description: "Registro diário de ordens de serviço realizadas.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#EDEFE8",
    theme_color: "#C1502E",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Registrar ordem", short_name: "Registrar", url: "/dashboard", icons: [{ src: "/icon-192", sizes: "192x192" }] },
      { name: "Extrato", url: "/extrato", icons: [{ src: "/icon-192", sizes: "192x192" }] },
    ],
  };
}
