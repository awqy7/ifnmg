"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { moodleApi } from "@/lib/api";

interface SyncContextType {
  syncing: boolean;
  syncProgress: string | null;
  triggerSync: () => Promise<void>;
  setSyncing: (v: boolean) => void;
  setSyncProgress: (v: string | null) => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const pollSyncStatus = useCallback(async () => {
    if (!syncing) return;
    let active = true;

    const poll = async () => {
      try {
        const st = await moodleApi.getSyncStatus();
        if (!active) return;

        if (st.running) {
          setSyncProgress(
            `Sincronizando dados... ${st.courses_done ? `${st.courses_done} disciplinas` : "iniciando"}`
          );
          setTimeout(poll, 2000);
        } else {
          setSyncing(false);
          if (st.error) {
            setSyncProgress("Erro na sincronização");
          } else {
            setSyncProgress(
              `Sincronizado com sucesso! ${st.courses_done || 0} disciplinas · ${st.materials || 0} materiais`
            );
            window.dispatchEvent(new CustomEvent("data-refresh"));
          }
          setTimeout(() => active && setSyncProgress(null), 5000);
        }
      } catch {
        if (active) {
          setTimeout(() => active && poll(), 3000);
        }
      }
    };

    poll();
    return () => { active = false; };
  }, [syncing]);

  useEffect(() => {
    if (syncing) {
      pollSyncStatus();
    }
  }, [syncing, pollSyncStatus]);

  const triggerSync = async () => {
    setSyncing(true);
    setSyncProgress("Sincronizando dados com o Virtual2... por favor aguarde");
    try {
      await moodleApi.forceSync();
      // polling handles the rest
    } catch (e: any) {
      setSyncing(false);
      setSyncProgress(e.message || "Erro ao sincronizar");
      setTimeout(() => setSyncProgress(null), 4000);
    }
  };

  // Auto-sync on first login
  useEffect(() => {
    // This will be triggered by the parent component that has user info
  }, []);

  return (
    <SyncContext.Provider value={{ syncing, syncProgress, triggerSync, setSyncing, setSyncProgress }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync deve ser usado dentro de SyncProvider");
  return ctx;
}