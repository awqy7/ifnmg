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
                  title: notif.title || "Notificacao",
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
          className="toast-enter flex items-start gap-3 p-3 rounded-xl bg-[#1c1c20] border border-[var(--border-strong)] shadow-xl shadow-black/50"
        >
          <div className="p-1.5 rounded-lg bg-emerald-500/[0.08] text-emerald-400/70 shrink-0">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[11px] font-semibold text-white truncate">{toast.title}</h4>
            <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-neutral-600 hover:text-neutral-400 transition-colors shrink-0"
            aria-label="Fechar notificação"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
