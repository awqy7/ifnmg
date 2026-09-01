import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#08080c",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "IFNMG Assistente — Seu Tutor Acadêmico de Elite",
  description: "Plataforma avançada de inteligência acadêmica para estudantes do IFNMG: sincronização inteligente com Virtual2, tutoria com IA e gestão de alto desempenho.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "IFNMG Assistente",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-[#08080c] text-white antialiased`}>
        <AuthProvider>
          <SyncProvider>
            {children}
          </SyncProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
