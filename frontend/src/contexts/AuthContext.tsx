"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { tokenStore } from "@/lib/token-store";

interface User {
  id: string;
  name: string;
  email: string;
  moodle_connected: boolean;
  moodle_last_sync: string | null;
  ai_provider: string;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Realiza um fetch autenticado usando cookies httpOnly + Bearer token como fallback.
 * Isso garante compatibilidade com iOS Safari (ITP bloqueia cookies cross-site).
 */
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
   * No iOS Safari o cookie pode não chegar; o Bearer token é o fallback.
   */
  const fetchMe = async (): Promise<User | null> => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.status === 401) {
        tokenStore.clear();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const data = await res.json();

    // Salva o token JWT em memória + sessionStorage + localStorage
    // O ApiClient vai incluí-lo em todos os requests subsequentes (iOS Safari fix)
    if (data.access_token) {
      tokenStore.set(data.access_token);
    }

    const me = await fetchMe();
    if (!me) throw new Error("Não foi possível obter dados do usuário após login.");
    setUser(me);
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    tokenStore.clear();
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