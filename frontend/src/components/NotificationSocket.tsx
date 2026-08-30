"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

  useEffect(() => {
    if (loading || !user) return;

    let closed = false;

    const getCookie = (name: string): string | null => {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
      return match ? match[2] : null;
    };

    const connect = () => {
      if (closed) return;
      const token = getCookie("ifnmg_token");
      if (!token) return;

      const apiHost = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const wsUrl = `${apiHost.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

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
          if (!closed) {
            reconnectTimer.current = setTimeout(connect, 15000);
          }
        };
      } catch {}
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [user, loading]);

  if (!user || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-5 right-3 sm:right-4 z-[100] space-y-2 max-w-[calc(100vw-1.5rem)] sm:max-w-xs">
      {toasts.map((toast) => (
        <div
          key={toast.id}
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
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-neutral-600 hover:text-neutral-400 transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
