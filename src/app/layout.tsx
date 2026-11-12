import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

// Fontes guardadas no projeto (src/app/fonts): o build não depende mais do Google Fonts,
// que às vezes respondia num formato que quebrava o deploy na Vercel.
const display = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "./fonts/SpaceGrotesk-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SpaceGrotesk-700.woff2", weight: "700", style: "normal" },
  ],
});

const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/IBMPlexSans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexSans-600.woff2", weight: "600", style: "normal" },
  ],
});

const mono = localFont({
  variable: "--font-mono",
  display: "swap",
  src: [
    { path: "./fonts/IBMPlexMono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexMono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexMono-600.woff2", weight: "600", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Ordens de Serviço",
  description: "Registro diário de ordens de serviço realizadas.",
  applicationName: "Ordens OS",
  formatDetection: { telephone: false },
  appleWebApp: {
    title: "Ordens OS",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#C1502E",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      localization={ptBR}
      appearance={{
        variables: {
          colorPrimary: "#C1502E",
        },
      }}
    >
      <html lang="pt-BR">
        <body
          className={`${display.variable} ${body.variable} ${mono.variable} font-body bg-paper text-ink antialiased`}
        >
          {children}
          <ServiceWorkerRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
