import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import PwaRegistrar from "@/components/PwaRegistrar";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#040504",
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
      <body className={`${inter.className} bg-ink-950 text-white antialiased`}>
        <AuthProvider>
          <SyncProvider>
            {children}
          </SyncProvider>
        </AuthProvider>
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "#0e120e",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f2fff7",
              borderRadius: "16px",
            },
          }}
        />
        <PwaRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
