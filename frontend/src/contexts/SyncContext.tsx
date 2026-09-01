"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
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
  // Ref para garantir que só existe um loop de polling ativo por vez
  const pollingRef = useRef<boolean>(false);

  /**
   * Inicia polling do status real do backend.
   * Só deve existir UMA instância deste loop rodando por vez.
   * Qualquer chamada adicional enquanto pollingRef.current === true é ignorada.
   */
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // já está fazendo polling, abortar
    pollingRef.current = true;

    const poll = async () => {
      if (!pollingRef.current) return;
      try {
        const st = await moodleApi.getSyncStatus();

        if (!pollingRef.current) return; // cancelado durante await

        if (st.running) {
          setSyncProgress(
            `Sincronizando dados... ${st.courses_done ? `${st.courses_done} disciplinas` : "iniciando"}`
          );
          // Continua polling enquanto o backend reportar running
          setTimeout(poll, 2000);
        } else {
          // Backend finalizou: atualiza estado e encerra loop
          pollingRef.current = false;
          setSyncing(false);

          if (st.error) {
            setSyncProgress("Erro na sincronização");
          } else {
            setSyncProgress(
              st.enrichment_running
                ? `Dados prontos! Processando documentos em segundo plano`
                : `Sincronizado! ${st.courses_done || 0} disciplinas · ${st.materials || 0} materiais`
            );
            // Dispara atualização global de dados (DashboardHome ouve este evento)
            window.dispatchEvent(new CustomEvent("data-refresh"));
          }
          // Limpa a mensagem após 5s
          setTimeout(() => setSyncProgress(null), 5000);
        }
      } catch {
        if (pollingRef.current) {
          // Erro de rede: tenta novamente em 3s
          setTimeout(poll, 3000);
        }
      }
    };

    poll();
  }, []); // sem dependências - estável

  // Inicia polling sempre que syncing passar para true
  useEffect(() => {
    if (syncing) {
      startPolling();
    }
  }, [syncing, startPolling]);

  // Cancela polling se o componente for desmontado
  useEffect(() => {
    return () => {
      pollingRef.current = false;
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncing) return; // evita sync duplo
    setSyncing(true);
    setSyncProgress("Sincronizando dados com o Virtual2... aguarde");
    try {
      await moodleApi.forceSync();
      // O polling (startPolling) é ativado automaticamente pelo useEffect acima
    } catch (e: unknown) {
      pollingRef.current = false;
      setSyncing(false);
      setSyncProgress(e instanceof Error ? e.message : "Erro ao sincronizar");
      setTimeout(() => setSyncProgress(null), 4000);
    }
  }, [syncing]);

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
