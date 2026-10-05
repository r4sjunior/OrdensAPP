import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const body = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Rose — ajuda de campo",
  description: "Senhas, códigos, configurações e links que a equipe técnica usa no dia a dia.",
  appleWebApp: { title: "Rose", capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#C1502E" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body bg-paper text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
