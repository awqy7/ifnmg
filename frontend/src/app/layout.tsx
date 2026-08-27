import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#0f0f13",
};

export const metadata: Metadata = {
  title: "IFNMG Assistente — Seu Tutor Acadêmico com IA",
  description: "Sistema inteligente de assistência acadêmica para alunos do IFNMG com notificações, resumos e tutor de IA",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-[#0f0f13] text-white antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
