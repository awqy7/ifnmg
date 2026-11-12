import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito-sans";
import "glisse/styles.css";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import PwaRegistrar from "@/components/PwaRegistrar";

export const viewport: Viewport = {
  themeColor: "#0c0f1d",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "IFNMG Assistente — Espaço de Estudos",
  description: "Organize seus estudos, acompanhe atividades e encontre apoio acadêmico em um só lugar.",
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
    <html lang="pt-BR" className="dark" data-theme="night">
      <body className="bg-[#0c0f1d] text-[#f5f3eb] antialiased selection:bg-lime-300 selection:text-slate-950">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[25%] -left-[10%] h-[600px] w-[600px] rounded-full bg-violet-500/[0.09] blur-[140px]" />
          <div className="absolute top-[40%] -right-[15%] h-[550px] w-[550px] rounded-full bg-cyan-500/[0.06] blur-[150px]" />
          <div className="absolute -bottom-[25%] left-[18%] h-[600px] w-[600px] rounded-full bg-lime-400/[0.035] blur-[160px]" />
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
              background: "rgba(24, 30, 47, 0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(217, 226, 255, 0.12)",
              color: "#f5f3eb",
              borderRadius: "18px",
              boxShadow: "0 20px 46px -24px rgba(0,0,0,0.84)",
            },
          }}
        />
        <PwaRegistrar />
        <Analytics />
      </body>
    </html>
  );
}
