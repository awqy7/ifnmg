import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@fontsource-variable/space-grotesk";
import "glisse/styles.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import PwaRegistrar from "@/components/PwaRegistrar";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#060908",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "IFNMG Assistente — Seu Tutor Acadêmico com Liquid Glass",
  description: "Plataforma avançada de inteligência acadêmica para estudantes do IFNMG: sincronização inteligente com Virtual2, tutoria com IA e interface Apple Liquid Glass.",
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
    <html lang="pt-BR" className="dark" data-theme="dark">
      <body className={`${inter.className} bg-ink-950 text-white antialiased selection:bg-accent/25 selection:text-white`}>
        {/* Camada ambiente de luz líquida para refração do glisse */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[25%] -left-[10%] h-[600px] w-[600px] rounded-full bg-emerald-500/[0.07] blur-[140px] animate-pulse-subtle" />
          <div className="absolute top-[40%] -right-[15%] h-[550px] w-[550px] rounded-full bg-teal-500/[0.05] blur-[150px]" />
          <div className="absolute -bottom-[20%] left-[25%] h-[650px] w-[650px] rounded-full bg-emerald-600/[0.06] blur-[160px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(69,255,156,0.08),rgba(255,255,255,0))]" />
        </div>

        <div className="relative z-10 min-h-dvh">
          <AuthProvider>
            <SyncProvider>
              {children}
            </SyncProvider>
          </AuthProvider>
        </div>

        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "rgba(18, 22, 20, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f2fff7",
              borderRadius: "18px",
              boxShadow: "0 20px 45px -15px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)",
            },
          }}
        />
        <PwaRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
