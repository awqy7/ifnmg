"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

interface Toast {
  id: number;
  title: string;
  message: string;
}

export default function NotificationSocket() {
  const { user, loading } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (loading || !user) return;

    let closed = false;

    const scheduleReconnect = () => {
      if (closed || reconnectTimer.current) return;
      const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempts.current);
      reconnectAttempts.current += 1;
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (closed) return;

      try {
        const { ticket } = await authApi.getWebSocketTicket();
        if (closed) return;
        const apiHost = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
        const wsUrl = `${apiHost.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(ticket)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempts.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "notification" && data.data) {
              const notif = data.data;
              const id = Date.now() + Math.random();
              setToasts((prev) => [
                ...prev.slice(-2),
                {
                  id,
                  title: notif.title || "Notificação",
                  message: notif.message || "",
                },
              ]);
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
              }, 6000);
              window.dispatchEvent(new CustomEvent("notif-refresh"));
            }
          } catch {}
        };

        ws.onclose = () => {
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
      reconnectAttempts.current = 0;
      wsRef.current?.close();
    };
  }, [user, loading]);

  if (!user || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-5 right-3 sm:right-4 z-[100] space-y-2 max-w-[calc(100vw-1.5rem)] sm:max-w-xs">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="toast-enter flex items-start gap-3 rounded-2xl border border-white/10 bg-ink-800/95 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-[11px] font-semibold text-white">{toast.title}</h4>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="shrink-0 rounded-md p-1 text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-zinc-300"
            aria-label="Fechar notificação"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
