"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi } from "@/lib/api";

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

// Chave para armazenar token em memória (fallback para mobile/Safari)
const TOKEN_STORAGE_KEY = "ifnmg_auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Tenta obter token salvo (fallback mobile)
  const getStoredToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  };

  const setStoredToken = (token: string | null) => {
    if (typeof window === "undefined") return;
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  // Cria headers com token fallback se cookie não funcionar
  const getAuthHeaders = (): HeadersInit => {
    const fallbackToken = getStoredToken();
    return {
      "Content-Type": "application/json",
      ...(fallbackToken ? { Authorization: `Bearer ${fallbackToken}` } : {}),
    };
  };

  // Wrapper para fetch com fallback de token
  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
      credentials: "include",
    });
    return res;
  };

  // Substitui métodos da api com fallback
  const authApiWithFallback = {
    moodleLogin: async (username: string, password: string) => {
      const res = await apiFetch("/api/auth/moodle-login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Erro na requisição");
      }
      return res.json();
    },
    getMe: async () => {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Erro na requisição");
      }
      return res.json();
    },
    logout: async () => {
      const res = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Erro na requisição");
      }
      return res.json();
    },
    updateMe: async (data: any) => {
      const res = await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Erro na requisição");
      }
      return res.json();
    },
  };

  useEffect(() => {
    // Tenta primeiro com cookie (funciona no desktop)
    authApiWithFallback.getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const data = await authApiWithFallback.moodleLogin(username, password);
    // Salva token como fallback para mobile/Safari
    if (data.access_token) {
      setStoredToken(data.access_token);
    }
    const me = await authApiWithFallback.getMe();
    setUser(me);
  };

  const logout = async () => {
    try {
      await authApiWithFallback.logout();
    } catch {}
    setStoredToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await authApiWithFallback.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
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