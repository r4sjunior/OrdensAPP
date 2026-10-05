import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rose — ajuda de campo",
    short_name: "Rose",
    description: "Senhas, códigos, configurações e links da equipe técnica.",
    start_url: "/",
    display: "standalone",
    background_color: "#EDEFE8",
    theme_color: "#C1502E",
    icons: [
      { src: "/rose-192.png", sizes: "192x192", type: "image/png" },
      { src: "/rose-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
