import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UTI Adulto — Gestão de Plantão",
  description: "Painel privado para acompanhamento clínico e gestão de plantão em UTI adulto.",
  other: {
    "codex-preview": "development",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "UTI HRIV", statusBarStyle: "default" },
  icons: {
    icon: "/uti-icon.svg",
    shortcut: "/uti-icon.svg",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#123b46" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
