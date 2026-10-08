import type { Metadata } from "next";
import "../tokens.css";
import "./globals.css";
import "./chat-glass.css";
import { MetaPixel } from "./components/MetaPixel";

export const metadata: Metadata = {
  title: "Atendimento Zasso",
  description:
    "Atendimento virtual da Zasso para dúvidas e qualificação comercial.",
  icons: {
    icon: [{ url: "/zasso-logo.png?v=20260915", type: "image/png" }],
    shortcut: "/zasso-logo.png?v=20260915",
    apple: "/zasso-logo.png?v=20260915",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
