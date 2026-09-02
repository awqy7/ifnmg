"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { api, moodleApi } from "@/lib/api";

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
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingStartedAtRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);
  const triggerInFlightRef = useRef(false);

  /**
   * Inicia polling do status real do backend.
   * Só deve existir UMA instância deste loop rodando por vez.
   * Qualquer chamada adicional enquanto pollingRef.current === true é ignorada.
   */
  const startPolling = useCallback(() => {
    if (pollingRef.current) return; // já está fazendo polling, abortar
    pollingRef.current = true;
    pollingStartedAtRef.current = Date.now();
    consecutiveErrorsRef.current = 0;

    const stopPolling = (message: string) => {
      pollingRef.current = false;
      setSyncing(false);
      setSyncProgress(message);
      pollingTimerRef.current = setTimeout(() => setSyncProgress(null), 5000);
    };

    const schedulePoll = (delay: number) => {
      pollingTimerRef.current = setTimeout(poll, delay);
    };

    const poll = async () => {
      if (!pollingRef.current) return;
      if (Date.now() - pollingStartedAtRef.current > 45 * 60 * 1000) {
        stopPolling("A sincronização demorou além do esperado. Tente novamente.");
        return;
      }
      try {
        const st = await moodleApi.getSyncStatus();
        consecutiveErrorsRef.current = 0;

        if (!pollingRef.current) return; // cancelado durante await

        if (st.running) {
          setSyncProgress(
            `Sincronizando dados... ${st.courses_done ? `${st.courses_done} disciplinas` : "iniciando"}`
          );
          // Continua polling enquanto o backend reportar running
          schedulePoll(2000);
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
            api.clearCache();
            window.dispatchEvent(new CustomEvent("data-refresh"));
          }
          // Limpa a mensagem após 5s
          pollingTimerRef.current = setTimeout(() => setSyncProgress(null), 5000);
        }
      } catch {
        if (pollingRef.current) {
          consecutiveErrorsRef.current += 1;
          if (consecutiveErrorsRef.current >= 5) {
            stopPolling("Conexão instável. A sincronização pode continuar no servidor.");
          } else {
            // Backoff progressivo evita pressionar uma conexão instável.
            schedulePoll(Math.min(15000, 2000 * 2 ** consecutiveErrorsRef.current));
          }
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
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncing || triggerInFlightRef.current) return;
    triggerInFlightRef.current = true;
    setSyncing(true);
    setSyncProgress("Sincronizando dados com o Virtual2... aguarde");
    try {
      await moodleApi.forceSync();
      // O polling (startPolling) é ativado automaticamente pelo useEffect acima
    } catch (e: unknown) {
      pollingRef.current = false;
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
      setSyncing(false);
      setSyncProgress(e instanceof Error ? e.message : "Erro ao sincronizar");
      setTimeout(() => setSyncProgress(null), 4000);
    } finally {
      triggerInFlightRef.current = false;
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
