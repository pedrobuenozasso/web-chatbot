import type { Metadata } from "next";
import "../tokens.css";
import "./globals.css";
import "./chat-glass.css";

export const metadata: Metadata = {
  title: "Atendimento Zasso",
  description:
    "Atendimento virtual da Zasso para dúvidas e qualificação comercial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
