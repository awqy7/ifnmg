"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  moodle_connected: boolean;
  moodle_last_sync: string | null;
  ai_provider: string;
  theme: string;
  notification_settings?: Record<string, boolean | string>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "";

/**
 * Usa o cookie httpOnly pela mesma origem.
 */
async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
    credentials: "include",
  });
  return res;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Tenta recuperar o usuário autenticado.
   * O proxy mantém o cookie em primeira parte, inclusive no Safari/iOS.
   */
  const fetchMe = async (): Promise<User | null> => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchMe()
      .then((me) => setUser(me))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => setUser(null);
    window.addEventListener("auth-expired", handleExpiredSession);
    return () => window.removeEventListener("auth-expired", handleExpiredSession);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiFetch("/api/auth/moodle-login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(
        err.detail || "Não foi possível autenticar no Virtual2. Confira seu usuário e senha institucionais."
      );
    }

    api.clearCache();

    const me = await fetchMe();
    if (!me) throw new Error("Não foi possível obter dados do usuário após login.");
    setUser(me);
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    api.clearCache();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await fetchMe();
    setUser(me);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
