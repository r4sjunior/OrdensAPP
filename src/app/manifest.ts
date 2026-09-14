import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ordens de Serviço",
    short_name: "Ordens OS",
    description: "Registro diário de ordens de serviço realizadas.",
    start_url: "/",
    display: "standalone",
    background_color: "#EDEFE8",
    theme_color: "#C1502E",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
