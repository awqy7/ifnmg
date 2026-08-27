"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, api } from "@/lib/api";

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
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      authApi.getMe()
        .then(setUser)
        .catch(() => {
          api.setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const data = await authApi.moodleLogin(username, password);
    api.setToken(data.access_token);
    const me = await authApi.getMe();
    setUser(me);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}
    api.setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      api.setToken(null);
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
