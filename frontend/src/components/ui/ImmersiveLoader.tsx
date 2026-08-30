'use client';

import { useState, ReactNode } from 'react';
import { CogSpinner } from './CogSpinner';

export const SYNC_STEPS = [
  { id: 'auth', label: 'Autenticando no Virtual2...' },
  { id: 'courses', label: 'Carregando disciplinas...' },
  { id: 'activities', label: 'Sincronizando atividades...' },
  { id: 'materials', label: 'Baixando materiais e PDFs...' },
  { id: 'grades', label: 'Atualizando notas...' },
  { id: 'calendar', label: 'Sincronizando calendário...' },
  { id: 'briefing', label: 'Gerando briefing matinal...' },
];

type Phase = 'idle' | 'login' | 'sync' | 'complete' | 'error';

export function LoginButton({
  onLogin,
  children,
  onError,
}: {
  onLogin: () => Promise<void>;
  children: ReactNode;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [syncProgress, setSyncProgress] = useState<{ currentStep: number; stepProgress: number; totalSteps: number } | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setPhase('login');
    try {
      await onLogin();
      setPhase('sync');
      
      const totalSteps = SYNC_STEPS.length;
      for (let i = 0; i < totalSteps; i++) {
        for (let p = 0; p <= 1; p += 0.05) {
          setSyncProgress({ currentStep: i, stepProgress: p, totalSteps });
          await new Promise(r => setTimeout(r, 80));
        }
        setSyncProgress(prev => prev ? { ...prev, stepProgress: 1 } : null);
        await new Promise(r => setTimeout(r, 200));
      }
      
      setPhase('complete');
      await new Promise(r => setTimeout(r, 800));
      setLoading(false);
      setPhase('idle');
      setSyncProgress(null);
    } catch (error: any) {
      onError?.(error.message || "Erro ao conectar. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="relative w-full min-h-11 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center overflow-hidden"
      >
        {loading ? (
          <CogSpinner size={28} className="text-white" />
        ) : (
          children
        )}
      </button>
    </>
  );
}

/**
 * Initial loading screen - shows while the app is loading for the first time
 * Shows a large CogSpinner centered on screen
 */
export function InitialLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#08080f]">
      <div className="flex flex-col items-center justify-center gap-6">
        <CogSpinner size={80} className="text-white" />
        <p className="text-white/60 text-sm font-medium tracking-wide">IFNMG Assistente</p>
      </div>
    </div>
  );
}